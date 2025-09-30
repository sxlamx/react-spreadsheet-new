"""
FastAPI service for pivot table operations using DuckDB
Supports dynamic pivot operations with flexible aggregations and filtering
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
import duckdb
import pandas as pd
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
import hashlib
import asyncio
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
log_format = os.getenv('LOG_FORMAT', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logging.basicConfig(level=getattr(logging, log_level), format=log_format)
logger = logging.getLogger(__name__)

# Data models for API requests/responses
class PivotField(BaseModel):
    id: str
    name: str
    dataType: str = Field(..., regex="^(string|number|date|boolean)$")
    format: Optional[str] = None

class PivotValueField(BaseModel):
    field: PivotField
    aggregation: str = Field(..., regex="^(sum|count|avg|min|max|countDistinct)$")
    format: Optional[str] = None
    displayName: Optional[str] = None

class PivotFilter(BaseModel):
    field: PivotField
    operator: str = Field(..., regex="^(equals|notEquals|contains|notContains|greaterThan|lessThan|greaterThanOrEqual|lessThanOrEqual|in|notIn|between|isEmpty|isNotEmpty)$")
    value: Any
    enabled: bool = True

class PivotConfiguration(BaseModel):
    rows: List[PivotField]
    columns: List[PivotField]
    values: List[PivotValueField]
    filters: List[PivotFilter] = []
    showSubtotals: bool = False
    showGrandTotals: bool = False
    maxRows: Optional[int] = None
    maxColumns: Optional[int] = None

class PivotRequest(BaseModel):
    dataset: str
    configuration: PivotConfiguration
    page: Optional[Dict[str, int]] = None
    expandedPaths: List[List[str]] = []
    cacheKey: Optional[str] = None

class PivotCell(BaseModel):
    value: Any
    formattedValue: str
    type: str
    level: Optional[int] = None
    isExpandable: bool = False
    isExpanded: bool = False
    path: List[str] = []
    originalRows: List[int] = []

class PivotHeader(BaseModel):
    label: str
    level: int
    span: int
    path: List[str]
    field: Optional[PivotField] = None
    isExpandable: bool = False
    isExpanded: bool = False

class PivotStructure(BaseModel):
    matrix: List[List[PivotCell]]
    rowHeaders: List[List[PivotHeader]]
    columnHeaders: List[List[PivotHeader]]
    rowCount: int
    columnCount: int
    totalRows: int
    totalColumns: int

class PivotResponse(BaseModel):
    structure: PivotStructure
    metadata: Dict[str, Any]
    hasMore: bool = False
    error: Optional[Dict[str, Any]] = None

class PivotDrillRequest(BaseModel):
    cacheKey: str
    path: List[str]
    action: str = Field(..., regex="^(expand|collapse)$")

class DatasetInfo(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    rowCount: Optional[int] = None
    path: str

class ExportConfig(BaseModel):
    format: str = Field(..., regex="^(csv|excel|pdf|json)$")
    includeHeaders: bool = True
    includeSubtotals: bool = True
    includeGrandTotals: bool = True
    filename: Optional[str] = None

# Global configuration from environment variables
DATA_BASE_PATH = Path(os.getenv('DATA_BASE_PATH', '/data'))
CACHE_TTL = timedelta(minutes=int(os.getenv('CACHE_TTL_MINUTES', '30')))
MAX_CACHE_SIZE = int(os.getenv('MAX_CACHE_SIZE', '100'))

# Server configuration
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', '8000'))
WORKERS = int(os.getenv('WORKERS', '1'))
RELOAD = os.getenv('RELOAD', 'false').lower() == 'true'

# CORS configuration
CORS_ORIGINS = json.loads(os.getenv('CORS_ORIGINS', '["*"]'))
CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'true').lower() == 'true'
CORS_ALLOW_METHODS = json.loads(os.getenv('CORS_ALLOW_METHODS', '["*"]'))
CORS_ALLOW_HEADERS = json.loads(os.getenv('CORS_ALLOW_HEADERS', '["*"]'))

# Authentication configuration (for future JWT implementation)
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-in-production')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '30'))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '7'))

# Google OAuth configuration (for future implementation)
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

# Performance configuration
MAX_ROWS_PER_QUERY = int(os.getenv('MAX_ROWS_PER_QUERY', '100000'))
MAX_COLUMNS_PER_QUERY = int(os.getenv('MAX_COLUMNS_PER_QUERY', '1000'))
QUERY_TIMEOUT_SECONDS = int(os.getenv('QUERY_TIMEOUT_SECONDS', '30'))

# Development configuration
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
TESTING = os.getenv('TESTING', 'false').lower() == 'true'

# In-memory cache for computed pivot results
pivot_cache: Dict[str, Dict[str, Any]] = {}

class DuckDBPivotService:
    """Service class for DuckDB pivot operations"""

    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.connections: Dict[str, duckdb.DuckDBPyConnection] = {}

    def get_connection(self, dataset: str) -> duckdb.DuckDBPyConnection:
        """Get or create a DuckDB connection for a dataset"""
        if dataset not in self.connections:
            db_path = self.data_path / f"{dataset}.duckdb"
            if not db_path.exists():
                raise HTTPException(status_code=404, detail=f"Dataset {dataset} not found")

            self.connections[dataset] = duckdb.connect(str(db_path))
            logger.info(f"Created connection for dataset: {dataset}")

        return self.connections[dataset]

    def get_available_datasets(self) -> List[DatasetInfo]:
        """Get list of available datasets"""
        datasets = []
        for db_file in self.data_path.glob("*.duckdb"):
            try:
                conn = duckdb.connect(str(db_file))
                tables = conn.execute("SHOW TABLES").fetchall()

                if tables:
                    # Get row count for the first table (assuming one main table per DB)
                    table_name = tables[0][0]
                    row_count = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]

                    datasets.append(DatasetInfo(
                        id=db_file.stem,
                        name=db_file.stem.replace("_", " ").title(),
                        description=f"Database with {len(tables)} tables",
                        rowCount=row_count,
                        path=str(db_file)
                    ))

                conn.close()
            except Exception as e:
                logger.warning(f"Error reading dataset {db_file}: {e}")

        return datasets

    def get_dataset_fields(self, dataset: str) -> List[PivotField]:
        """Get available fields for a dataset"""
        conn = self.get_connection(dataset)

        # Get the first table (assuming one main table per dataset)
        tables = conn.execute("SHOW TABLES").fetchall()
        if not tables:
            raise HTTPException(status_code=404, detail=f"No tables found in dataset {dataset}")

        table_name = tables[0][0]

        # Get column information
        columns = conn.execute(f"DESCRIBE {table_name}").fetchall()

        fields = []
        for col_name, col_type, nullable, *_ in columns:
            # Map DuckDB types to our types
            data_type = self._map_duckdb_type(col_type)

            fields.append(PivotField(
                id=col_name,
                name=col_name.replace("_", " ").title(),
                dataType=data_type
            ))

        return fields

    def get_field_values(self, dataset: str, field_id: str, limit: int = 100) -> List[Any]:
        """Get unique values for a field (for filtering)"""
        conn = self.get_connection(dataset)

        # Get the first table
        tables = conn.execute("SHOW TABLES").fetchall()
        table_name = tables[0][0]

        # Get unique values
        query = f"""
        SELECT DISTINCT "{field_id}"
        FROM {table_name}
        WHERE "{field_id}" IS NOT NULL
        ORDER BY "{field_id}"
        LIMIT {limit}
        """

        result = conn.execute(query).fetchall()
        return [row[0] for row in result]

    def compute_pivot(self, request: PivotRequest) -> PivotResponse:
        """Compute pivot table using DuckDB PIVOT functionality"""
        start_time = datetime.now()

        try:
            conn = self.get_connection(request.dataset)

            # Get the main table name
            tables = conn.execute("SHOW TABLES").fetchall()
            table_name = tables[0][0]

            # Build the pivot query
            pivot_query = self._build_pivot_query(table_name, request.configuration)

            logger.info(f"Executing pivot query: {pivot_query}")

            # Execute the query
            result = conn.execute(pivot_query).fetchdf()

            # Convert result to our pivot structure
            structure = self._convert_to_pivot_structure(result, request.configuration)

            computation_time = (datetime.now() - start_time).total_seconds() * 1000
            cache_key = self._generate_cache_key(request)

            # Cache the result
            pivot_cache[cache_key] = {
                'structure': structure,
                'timestamp': datetime.now(),
                'request': request
            }

            response = PivotResponse(
                structure=structure,
                metadata={
                    'totalDataRows': len(result),
                    'computationTime': computation_time,
                    'cacheKey': cache_key,
                    'timestamp': int(datetime.now().timestamp())
                }
            )

            return response

        except Exception as e:
            logger.error(f"Error computing pivot: {e}")
            raise HTTPException(status_code=500, detail=f"Pivot computation failed: {str(e)}")

    def _build_pivot_query(self, table_name: str, config: PivotConfiguration) -> str:
        """Build DuckDB PIVOT query from configuration"""

        # Start with base table
        query_parts = [f"FROM {table_name}"]

        # Apply filters
        if config.filters:
            where_clauses = []
            for filter_item in config.filters:
                if filter_item.enabled:
                    clause = self._build_filter_clause(filter_item)
                    if clause:
                        where_clauses.append(clause)

            if where_clauses:
                query_parts.append(f"WHERE {' AND '.join(where_clauses)}")

        # Build PIVOT operation
        if config.columns:
            # Use DuckDB's PIVOT syntax
            pivot_columns = [f'"{col.id}"' for col in config.columns]

            # Build aggregation expressions
            if config.values:
                aggregations = []
                for value_field in config.values:
                    agg_func = self._map_aggregation(value_field.aggregation)
                    field_name = f'"{value_field.field.id}"'
                    aggregations.append(f'{agg_func}({field_name}) AS {value_field.displayName or value_field.field.name}')

                using_clause = f"USING {', '.join(aggregations)}"
            else:
                using_clause = "USING count(*)"

            # Build GROUP BY clause
            if config.rows:
                group_by_columns = [f'"{row.id}"' for row in config.rows]
                group_by_clause = f"GROUP BY {', '.join(group_by_columns)}"
            else:
                group_by_clause = ""

            # Construct the full PIVOT query
            base_query = f"SELECT * {' '.join(query_parts)}"

            pivot_query = f"""
            PIVOT ({base_query})
            ON {', '.join(pivot_columns)}
            {using_clause}
            {group_by_clause}
            """
        else:
            # No pivot, just aggregation
            if config.values:
                select_parts = []

                # Add grouping columns
                if config.rows:
                    select_parts.extend([f'"{row.id}"' for row in config.rows])

                # Add aggregations
                for value_field in config.values:
                    agg_func = self._map_aggregation(value_field.aggregation)
                    field_name = f'"{value_field.field.id}"'
                    alias = value_field.displayName or value_field.field.name
                    select_parts.append(f'{agg_func}({field_name}) AS "{alias}"')

                select_clause = f"SELECT {', '.join(select_parts)}"

                # Add GROUP BY if we have row dimensions
                if config.rows:
                    group_by_columns = [f'"{row.id}"' for row in config.rows]
                    group_by_clause = f"GROUP BY {', '.join(group_by_columns)}"
                else:
                    group_by_clause = ""

                pivot_query = f"{select_clause} {' '.join(query_parts)} {group_by_clause}"
            else:
                # Simple select
                pivot_query = f"SELECT * {' '.join(query_parts)}"

        # Add LIMIT if specified
        if config.maxRows:
            pivot_query += f" LIMIT {config.maxRows}"

        return pivot_query

    def _build_filter_clause(self, filter_item: PivotFilter) -> str:
        """Build WHERE clause for a filter"""
        field_name = f'"{filter_item.field.id}"'
        operator = filter_item.operator
        value = filter_item.value

        if operator == "equals":
            return f"{field_name} = '{value}'"
        elif operator == "notEquals":
            return f"{field_name} != '{value}'"
        elif operator == "contains":
            return f"{field_name} LIKE '%{value}%'"
        elif operator == "notContains":
            return f"{field_name} NOT LIKE '%{value}%'"
        elif operator == "greaterThan":
            return f"{field_name} > {value}"
        elif operator == "lessThan":
            return f"{field_name} < {value}"
        elif operator == "greaterThanOrEqual":
            return f"{field_name} >= {value}"
        elif operator == "lessThanOrEqual":
            return f"{field_name} <= {value}"
        elif operator == "in" and isinstance(value, list):
            values = "', '".join(str(v) for v in value)
            return f"{field_name} IN ('{values}')"
        elif operator == "notIn" and isinstance(value, list):
            values = "', '".join(str(v) for v in value)
            return f"{field_name} NOT IN ('{values}')"
        elif operator == "between" and isinstance(value, dict):
            return f"{field_name} BETWEEN {value.get('min')} AND {value.get('max')}"
        elif operator == "isEmpty":
            return f"{field_name} IS NULL OR {field_name} = ''"
        elif operator == "isNotEmpty":
            return f"{field_name} IS NOT NULL AND {field_name} != ''"

        return ""

    def _map_aggregation(self, aggregation: str) -> str:
        """Map our aggregation types to DuckDB functions"""
        mapping = {
            'sum': 'SUM',
            'count': 'COUNT',
            'avg': 'AVG',
            'min': 'MIN',
            'max': 'MAX',
            'countDistinct': 'COUNT(DISTINCT'
        }

        if aggregation == 'countDistinct':
            return 'COUNT(DISTINCT'  # Will need to close the parenthesis in usage

        return mapping.get(aggregation, 'COUNT')

    def _map_duckdb_type(self, duckdb_type: str) -> str:
        """Map DuckDB data types to our field types"""
        duckdb_type = duckdb_type.upper()

        if 'INT' in duckdb_type or 'FLOAT' in duckdb_type or 'DOUBLE' in duckdb_type or 'DECIMAL' in duckdb_type:
            return 'number'
        elif 'DATE' in duckdb_type or 'TIME' in duckdb_type:
            return 'date'
        elif 'BOOL' in duckdb_type:
            return 'boolean'
        else:
            return 'string'

    def _convert_to_pivot_structure(self, df: pd.DataFrame, config: PivotConfiguration) -> PivotStructure:
        """Convert pandas DataFrame to our PivotStructure format"""

        # Simple conversion for now - in a full implementation this would be more sophisticated
        matrix = []
        for _, row in df.iterrows():
            cell_row = []
            for col_name, value in row.items():
                cell = PivotCell(
                    value=value,
                    formattedValue=str(value) if value is not None else "",
                    type="data"
                )
                cell_row.append(cell)
            matrix.append(cell_row)

        # Create basic headers
        column_headers = [[]]
        for col_name in df.columns:
            header = PivotHeader(
                label=col_name,
                level=0,
                span=1,
                path=[col_name]
            )
            column_headers[0].append(header)

        row_headers = []  # Would build row headers based on grouping columns

        return PivotStructure(
            matrix=matrix,
            rowHeaders=row_headers,
            columnHeaders=column_headers,
            rowCount=len(matrix),
            columnCount=len(matrix[0]) if matrix else 0,
            totalRows=len(matrix),
            totalColumns=len(matrix[0]) if matrix else 0
        )

    def _generate_cache_key(self, request: PivotRequest) -> str:
        """Generate cache key for a pivot request"""
        # Create a hash of the request parameters
        request_str = json.dumps({
            'dataset': request.dataset,
            'configuration': request.configuration.dict(),
            'expandedPaths': request.expandedPaths
        }, sort_keys=True)

        return hashlib.md5(request_str.encode()).hexdigest()

# Initialize the service
pivot_service = DuckDBPivotService(DATA_BASE_PATH)

# FastAPI app
app = FastAPI(
    title="Pivot Table API",
    description="FastAPI service for dynamic pivot table operations using DuckDB",
    version="1.0.0"
)

# CORS middleware with environment configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "uptime": int(datetime.now().timestamp())
    }

# Get available datasets
@app.get("/datasets", response_model=List[DatasetInfo])
async def get_datasets():
    """Get list of available datasets"""
    try:
        return pivot_service.get_available_datasets()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get fields for a dataset
@app.get("/datasets/{dataset}/fields", response_model=List[PivotField])
async def get_dataset_fields(dataset: str):
    """Get available fields for a dataset"""
    try:
        return pivot_service.get_dataset_fields(dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get field values for filtering
@app.get("/datasets/{dataset}/fields/{field_id}/values")
async def get_field_values(dataset: str, field_id: str, limit: int = 100):
    """Get unique values for a field"""
    try:
        return pivot_service.get_field_values(dataset, field_id, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Compute pivot table
@app.post("/pivot/compute", response_model=PivotResponse)
async def compute_pivot(request: PivotRequest):
    """Compute pivot table"""
    try:
        return pivot_service.compute_pivot(request)
    except Exception as e:
        logger.error(f"Error in compute_pivot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Drill down operation
@app.post("/pivot/drill", response_model=PivotResponse)
async def drill_down(request: PivotDrillRequest):
    """Perform drill-down operation"""
    try:
        # Get cached result
        if request.cacheKey not in pivot_cache:
            raise HTTPException(status_code=404, detail="Cache key not found")

        cached_data = pivot_cache[request.cacheKey]
        original_request = cached_data['request']

        # Update expanded paths based on drill request
        if request.action == "expand":
            if request.path not in original_request.expandedPaths:
                original_request.expandedPaths.append(request.path)
        else:  # collapse
            if request.path in original_request.expandedPaths:
                original_request.expandedPaths.remove(request.path)

        # Recompute with updated paths
        return pivot_service.compute_pivot(original_request)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Export pivot table
@app.post("/pivot/export/{format}")
async def export_pivot(format: str, request: PivotRequest, export_config: ExportConfig):
    """Export pivot table in specified format"""
    try:
        # Compute the pivot first
        pivot_response = pivot_service.compute_pivot(request)

        # For now, return a simple message - in a full implementation,
        # this would generate the actual file in the requested format
        return {
            "message": f"Export to {format} would be generated here",
            "rowCount": pivot_response.structure.rowCount,
            "columnCount": pivot_response.structure.columnCount
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Background task to clean up cache
async def cleanup_cache():
    """Clean up expired cache entries"""
    while True:
        try:
            current_time = datetime.now()
            expired_keys = []

            for key, data in pivot_cache.items():
                if current_time - data['timestamp'] > CACHE_TTL:
                    expired_keys.append(key)

            for key in expired_keys:
                del pivot_cache[key]

            logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

        except Exception as e:
            logger.error(f"Error in cache cleanup: {e}")

        # Wait 5 minutes before next cleanup
        await asyncio.sleep(300)

# Start background tasks
@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    asyncio.create_task(cleanup_cache())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        workers=WORKERS if not RELOAD else 1,  # Workers must be 1 when reload is enabled
        reload=RELOAD,
        log_level=log_level.lower()
    )
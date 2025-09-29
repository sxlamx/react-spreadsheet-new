# Pivot Table FastAPI Service

A high-performance FastAPI service that provides pivot table functionality using DuckDB for server-side computation. This service is designed to work with the React Spreadsheet component for displaying multi-dimensional pivot tables.

## Features

- **DuckDB Integration**: Leverages DuckDB's native PIVOT and UNPIVOT operations for optimal performance
- **Dynamic Queries**: Builds DuckDB queries dynamically based on pivot configurations
- **Flexible Aggregations**: Supports sum, count, avg, min, max, and count distinct operations
- **Advanced Filtering**: Comprehensive filtering capabilities with multiple operators
- **Drill-down Support**: Interactive expand/collapse functionality for hierarchical data
- **Caching**: Built-in result caching for improved performance
- **Export Capabilities**: Support for CSV, Excel, PDF, and JSON exports
- **Real-time Operations**: Asynchronous processing with background tasks

## Architecture

### Data Storage Convention

The service expects DuckDB databases to be stored in `/data/` with the following convention:
```
/data/
├── project_name_1.duckdb
├── project_name_2.duckdb
└── project_name_3.duckdb
```

Each DuckDB file should contain one main table with the data to be pivoted.

### API Endpoints

#### Core Endpoints

- `GET /health` - Health check
- `GET /datasets` - List available datasets
- `GET /datasets/{dataset}/fields` - Get available fields for a dataset
- `GET /datasets/{dataset}/fields/{field_id}/values` - Get unique values for filtering
- `POST /pivot/compute` - Compute pivot table
- `POST /pivot/drill` - Perform drill-down operations
- `POST /pivot/export/{format}` - Export pivot table

#### Dataset Management

The service automatically discovers DuckDB files in the `/data/` directory and exposes them as datasets. Each dataset corresponds to a DuckDB file.

## Installation & Setup

### Prerequisites

- Python 3.9+
- DuckDB databases in `/data/` directory

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Prepare your data:
```bash
# Create data directory
mkdir -p /data

# Copy your DuckDB files to /data/
cp your_project.duckdb /data/
```

3. Start the service:
```bash
python pivot_api.py
```

Or with uvicorn:
```bash
uvicorn pivot_api:app --host 0.0.0.0 --port 8000 --reload
```

### Docker Setup

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Create data directory
RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "pivot_api:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Usage Examples

### Basic Pivot Request

```python
import requests

# Configure pivot
pivot_request = {
    "dataset": "sales_data",
    "configuration": {
        "rows": [
            {"id": "region", "name": "Region", "dataType": "string"}
        ],
        "columns": [
            {"id": "quarter", "name": "Quarter", "dataType": "string"}
        ],
        "values": [
            {
                "field": {"id": "sales", "name": "Sales", "dataType": "number"},
                "aggregation": "sum",
                "displayName": "Total Sales"
            }
        ],
        "filters": [
            {
                "field": {"id": "year", "name": "Year", "dataType": "number"},
                "operator": "equals",
                "value": 2023,
                "enabled": True
            }
        ]
    }
}

# Send request
response = requests.post("http://localhost:8000/pivot/compute", json=pivot_request)
pivot_result = response.json()
```

### DuckDB Query Generation

The service automatically converts pivot configurations into optimized DuckDB queries:

```sql
-- Generated query for the above request
PIVOT (
    SELECT * FROM sales_data
    WHERE "year" = 2023
)
ON "quarter"
USING SUM("sales") AS "Total Sales"
GROUP BY "region"
```

### Advanced Filtering

```python
# Complex filter example
filters = [
    {
        "field": {"id": "date", "name": "Date", "dataType": "date"},
        "operator": "between",
        "value": {"min": "2023-01-01", "max": "2023-12-31"}
    },
    {
        "field": {"id": "category", "name": "Category", "dataType": "string"},
        "operator": "in",
        "value": ["Electronics", "Clothing", "Books"]
    }
]
```

## Performance Considerations

### DuckDB Optimizations

1. **Columnar Storage**: DuckDB's columnar format provides excellent performance for analytical queries
2. **Vectorized Execution**: Operations are vectorized for optimal CPU utilization
3. **Automatic Indexing**: DuckDB automatically creates indexes for better query performance
4. **Parallel Processing**: Queries are automatically parallelized across available cores

### Caching Strategy

- Results are cached using a hash of the request parameters
- Cache TTL is 30 minutes by default
- Background task cleans up expired cache entries
- Cache size is limited to prevent memory issues

### Memory Management

- Large result sets are handled efficiently by DuckDB's memory management
- Pagination support for very large pivot tables
- Configurable row and column limits

## Data Preparation

### Creating DuckDB Files

```python
import duckdb
import pandas as pd

# Load your data
df = pd.read_csv("sales_data.csv")

# Create DuckDB file
conn = duckdb.connect("/data/sales_project.duckdb")
conn.execute("CREATE TABLE sales_data AS SELECT * FROM df")
conn.close()
```

### Recommended Schema

For optimal pivot performance, structure your data with:

- **Dimension columns**: Categories, dates, regions (for rows/columns)
- **Measure columns**: Numeric values to aggregate (for values)
- **Proper data types**: Use appropriate DuckDB types (INTEGER, DOUBLE, VARCHAR, DATE)

```sql
CREATE TABLE sales_data (
    id INTEGER PRIMARY KEY,
    date DATE,
    region VARCHAR,
    category VARCHAR,
    product VARCHAR,
    sales_amount DOUBLE,
    quantity INTEGER,
    profit DOUBLE
);
```

## Error Handling

The service provides comprehensive error handling:

- **400 Bad Request**: Invalid pivot configuration
- **404 Not Found**: Dataset or cache key not found
- **500 Internal Server Error**: Database or computation errors

Error responses include detailed messages for debugging:

```json
{
    "detail": "Pivot computation failed: Invalid aggregation function 'invalid_agg'"
}
```

## Configuration

### Environment Variables

```bash
# Optional configuration
DATA_BASE_PATH=/data
CACHE_TTL_MINUTES=30
MAX_CACHE_SIZE=100
LOG_LEVEL=INFO
```

### Production Deployment

1. Use a reverse proxy (nginx/Apache)
2. Configure CORS appropriately
3. Set up SSL/TLS
4. Monitor with tools like Prometheus
5. Use a process manager like systemd or supervisor

```bash
# Example systemd service
[Unit]
Description=Pivot API Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/app
Environment=PATH=/app/venv/bin
ExecStart=/app/venv/bin/uvicorn pivot_api:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

## Monitoring & Logging

The service includes structured logging for monitoring:

- Request/response logging
- Query execution times
- Cache hit/miss ratios
- Error tracking

Use with monitoring tools like:
- Prometheus + Grafana
- ELK Stack
- DataDog
- New Relic

## Integration with React Spreadsheet

The service is designed to work seamlessly with the React Spreadsheet pivot component:

```typescript
// Frontend integration
import { createPivotApiClient } from './src/pivot/api-client';

const apiClient = createPivotApiClient('http://localhost:8000');

// Use with React Query hooks
const { data, isLoading } = usePivotData({
    dataset: 'sales_data',
    configuration: pivotConfig
});
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/
```

### API Documentation

Access interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
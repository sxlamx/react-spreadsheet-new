/**
 * Server-Side Data Generator
 * Generates realistic business data that simulates what would come from a real server/database
 */

import { PivotDataSet, PivotField } from '../types';

export interface DataGenerationConfig {
  /** Number of records to generate */
  recordCount: number;
  /** Date range for the data */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Business domains to include */
  domains: string[];
  /** Whether to include seasonal variations */
  includeSeasonality: boolean;
  /** Whether to include regional variations */
  includeRegionalVariations: boolean;
  /** Random seed for reproducible data */
  seed?: number;
}

export class ServerDataGenerator {
  private seed: number;
  private random: () => number;

  // Business domain definitions
  private readonly businessDomains = {
    'e-commerce': {
      categories: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys'],
      products: {
        'Electronics': ['Smartphone Pro', 'Laptop Ultra', 'Tablet Max', 'Wireless Headphones', 'Smart Watch', 'Gaming Console'],
        'Clothing': ['Designer Jeans', 'Premium T-Shirt', 'Winter Jacket', 'Running Shoes', 'Casual Dress', 'Business Suit'],
        'Home & Garden': ['Smart Thermostat', 'Garden Tool Set', 'Kitchen Appliance', 'Outdoor Furniture', 'LED Light Strip', 'Plant Collection'],
        'Sports': ['Yoga Mat Pro', 'Fitness Tracker', 'Tennis Racket', 'Basketball', 'Swimming Goggles', 'Protein Powder'],
        'Books': ['Programming Guide', 'Business Strategy', 'Self-Help Manual', 'Fiction Novel', 'Cookbook Collection', 'Science Textbook'],
        'Toys': ['Educational Robot', 'Building Blocks', 'Art Supply Kit', 'Board Game', 'Remote Control Car', 'Puzzle Set']
      },
      channels: ['Online', 'Retail Store', 'Mobile App', 'Marketplace', 'Social Commerce'],
      customerSegments: ['Premium', 'Standard', 'Budget', 'Enterprise', 'Student']
    },
    'saas': {
      categories: ['Enterprise Software', 'Developer Tools', 'Marketing Automation', 'Analytics', 'Communication', 'Security'],
      products: {
        'Enterprise Software': ['CRM Platform', 'ERP System', 'Project Management', 'HR Suite', 'Finance Manager', 'Supply Chain'],
        'Developer Tools': ['Code Editor Pro', 'API Testing Tool', 'Database Manager', 'Cloud IDE', 'Version Control', 'CI/CD Pipeline'],
        'Marketing Automation': ['Email Campaign Tool', 'Social Media Manager', 'Lead Generation', 'Customer Journey', 'A/B Testing', 'Analytics Dashboard'],
        'Analytics': ['Business Intelligence', 'Data Visualization', 'Predictive Analytics', 'Real-time Monitoring', 'Report Builder', 'KPI Tracker'],
        'Communication': ['Video Conferencing', 'Team Chat', 'Document Collaboration', 'Knowledge Base', 'Customer Support', 'Virtual Events'],
        'Security': ['Identity Management', 'Threat Detection', 'Data Encryption', 'Compliance Monitor', 'Access Control', 'Security Audit']
      },
      channels: ['Direct Sales', 'Partner Channel', 'Self-Service', 'Marketplace', 'Reseller'],
      customerSegments: ['Enterprise', 'Mid-Market', 'Small Business', 'Startup', 'Individual']
    },
    'manufacturing': {
      categories: ['Automotive Parts', 'Industrial Equipment', 'Consumer Goods', 'Medical Devices', 'Aerospace Components', 'Electronics Components'],
      products: {
        'Automotive Parts': ['Engine Component', 'Brake System', 'Transmission Part', 'Electrical System', 'Safety Equipment', 'Interior Accessory'],
        'Industrial Equipment': ['Manufacturing Robot', 'Conveyor System', 'Quality Control Tool', 'Safety Equipment', 'Maintenance Tool', 'Process Monitor'],
        'Consumer Goods': ['Kitchen Appliance', 'Personal Care Item', 'Home Improvement', 'Outdoor Equipment', 'Fitness Product', 'Entertainment Device'],
        'Medical Devices': ['Diagnostic Equipment', 'Surgical Instrument', 'Patient Monitor', 'Rehabilitation Tool', 'Laboratory Equipment', 'Protective Gear'],
        'Aerospace Components': ['Navigation System', 'Communication Equipment', 'Safety System', 'Engine Part', 'Structural Component', 'Control System'],
        'Electronics Components': ['Microprocessor', 'Memory Module', 'Sensor Array', 'Power Supply', 'Display Panel', 'Circuit Board']
      },
      channels: ['Direct B2B', 'Distributor', 'OEM Partner', 'Retail', 'Online'],
      customerSegments: ['Fortune 500', 'Mid-Market', 'Small Business', 'Government', 'International']
    }
  };

  private readonly regions = [
    'North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East & Africa',
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'China', 'India', 'Australia', 'Brazil'
  ];

  private readonly salesReps = [
    'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Brown', 'Frank Miller',
    'Grace Lee', 'Henry Taylor', 'Iris Chen', 'Jack Anderson', 'Karen White', 'Liam Garcia'
  ];

  constructor(config: DataGenerationConfig) {
    this.seed = config.seed || Date.now();
    this.random = this.seededRandom(this.seed);
  }

  /**
   * Generate comprehensive business dataset
   */
  generateDataset(config: DataGenerationConfig): PivotDataSet {
    const data: PivotDataSet = [];
    const domains = config.domains.length > 0 ? config.domains : ['e-commerce'];

    for (let i = 0; i < config.recordCount; i++) {
      const domain = domains[Math.floor(this.random() * domains.length)];
      const record = this.generateRecord(domain, config, i);
      data.push(record);
    }

    return data;
  }

  /**
   * Generate available fields metadata (simulates server field discovery)
   */
  generateFieldMetadata(domains: string[]): PivotField[] {
    const baseFields: PivotField[] = [
      { id: 'date', name: 'date', dataType: 'date' },
      { id: 'year', name: 'year', dataType: 'number' },
      { id: 'quarter', name: 'quarter', dataType: 'string' },
      { id: 'month', name: 'month', dataType: 'string' },
      { id: 'week', name: 'week', dataType: 'number' },
      { id: 'region', name: 'region', dataType: 'string' },
      { id: 'country', name: 'country', dataType: 'string' },
      { id: 'category', name: 'category', dataType: 'string' },
      { id: 'product', name: 'product', dataType: 'string' },
      { id: 'channel', name: 'channel', dataType: 'string' },
      { id: 'customerSegment', name: 'customerSegment', dataType: 'string' },
      { id: 'salesRep', name: 'salesRep', dataType: 'string' },
      { id: 'revenue', name: 'revenue', dataType: 'number' },
      { id: 'quantity', name: 'quantity', dataType: 'number' },
      { id: 'cost', name: 'cost', dataType: 'number' },
      { id: 'profit', name: 'profit', dataType: 'number' },
      { id: 'margin', name: 'margin', dataType: 'number' },
      { id: 'discount', name: 'discount', dataType: 'number' },
      { id: 'customerSatisfaction', name: 'customerSatisfaction', dataType: 'number' },
      { id: 'isActive', name: 'isActive', dataType: 'boolean' }
    ];

    // Add domain-specific fields
    if (domains.includes('saas')) {
      baseFields.push(
        { id: 'subscriptionType', name: 'subscriptionType', dataType: 'string' },
        { id: 'churnRate', name: 'churnRate', dataType: 'number' },
        { id: 'arrGrowth', name: 'arrGrowth', dataType: 'number' },
        { id: 'userCount', name: 'userCount', dataType: 'number' }
      );
    }

    if (domains.includes('manufacturing')) {
      baseFields.push(
        { id: 'productionLine', name: 'productionLine', dataType: 'string' },
        { id: 'qualityScore', name: 'qualityScore', dataType: 'number' },
        { id: 'defectRate', name: 'defectRate', dataType: 'number' },
        { id: 'cycleTime', name: 'cycleTime', dataType: 'number' }
      );
    }

    return baseFields;
  }

  private generateRecord(domain: string, config: DataGenerationConfig, index: number): any {
    const domainData = this.businessDomains[domain as keyof typeof this.businessDomains];
    const date = this.generateDate(config.dateRange);
    const category = this.randomChoice(domainData.categories);
    const product = this.randomChoice(domainData.products[category]);
    const region = this.randomChoice(this.regions);
    const channel = this.randomChoice(domainData.channels);
    const customerSegment = this.randomChoice(domainData.customerSegments);
    const salesRep = this.randomChoice(this.salesReps);

    // Base financial metrics
    const baseRevenue = this.generateRevenueByDomain(domain, category, customerSegment);
    const seasonalMultiplier = config.includeSeasonality ? this.getSeasonalMultiplier(date) : 1;
    const regionalMultiplier = config.includeRegionalVariations ? this.getRegionalMultiplier(region) : 1;

    const revenue = Math.round(baseRevenue * seasonalMultiplier * regionalMultiplier);
    const quantity = Math.max(1, Math.round(revenue / this.getAverageUnitPrice(domain, category)));
    const costRatio = 0.4 + (this.random() * 0.3); // 40-70% cost ratio
    const cost = Math.round(revenue * costRatio);
    const profit = revenue - cost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) / 100 : 0;
    const discount = Math.round(this.random() * 0.2 * 100) / 100; // 0-20% discount
    const customerSatisfaction = 3.0 + (this.random() * 2.0); // 3.0-5.0 rating

    const record: any = {
      id: `record_${index + 1}`,
      date: date.toISOString().split('T')[0],
      year: date.getFullYear(),
      quarter: `Q${Math.floor(date.getMonth() / 3) + 1}`,
      month: date.toLocaleString('default', { month: 'long' }),
      week: this.getWeekNumber(date),
      region,
      country: this.getCountryFromRegion(region),
      category,
      product,
      channel,
      customerSegment,
      salesRep,
      revenue,
      quantity,
      cost,
      profit,
      margin,
      discount,
      customerSatisfaction: Math.round(customerSatisfaction * 10) / 10,
      isActive: this.random() > 0.1 // 90% active rate
    };

    // Add domain-specific fields
    if (domain === 'saas') {
      record.subscriptionType = this.randomChoice(['Monthly', 'Annual', 'Multi-Year']);
      record.churnRate = Math.round(this.random() * 0.1 * 100) / 100; // 0-10% churn
      record.arrGrowth = Math.round((0.8 + this.random() * 0.4) * 100) / 100; // 80-120% growth
      record.userCount = Math.max(1, Math.round(quantity * (10 + this.random() * 90))); // 10-100 users per license
    }

    if (domain === 'manufacturing') {
      record.productionLine = `Line ${String.fromCharCode(65 + Math.floor(this.random() * 5))}`; // Line A-E
      record.qualityScore = 85 + Math.round(this.random() * 15); // 85-100% quality
      record.defectRate = Math.round(this.random() * 0.05 * 100) / 100; // 0-5% defect rate
      record.cycleTime = Math.round(10 + this.random() * 50); // 10-60 minutes cycle time
    }

    return record;
  }

  private generateRevenueByDomain(domain: string, category: string, segment: string): number {
    const baseRanges = {
      'e-commerce': { min: 50, max: 5000 },
      'saas': { min: 500, max: 50000 },
      'manufacturing': { min: 1000, max: 100000 }
    };

    const segmentMultipliers = {
      'Premium': 2.0, 'Enterprise': 3.0, 'Fortune 500': 5.0,
      'Standard': 1.0, 'Mid-Market': 1.5,
      'Budget': 0.6, 'Small Business': 0.8, 'Startup': 0.5,
      'Student': 0.3, 'Individual': 0.4
    };

    const range = baseRanges[domain as keyof typeof baseRanges];
    const baseRevenue = range.min + (this.random() * (range.max - range.min));
    const multiplier = segmentMultipliers[segment as keyof typeof segmentMultipliers] || 1.0;

    return baseRevenue * multiplier;
  }

  private generateDate(range: { start: Date; end: Date }): Date {
    const startTime = range.start.getTime();
    const endTime = range.end.getTime();
    const randomTime = startTime + (this.random() * (endTime - startTime));
    return new Date(randomTime);
  }

  private getSeasonalMultiplier(date: Date): number {
    const month = date.getMonth();
    // Q4 holiday season boost, Q1 post-holiday dip
    const seasonalFactors = [0.8, 0.9, 1.0, 1.1, 1.1, 1.0, 0.9, 0.9, 1.0, 1.1, 1.3, 1.4];
    return seasonalFactors[month];
  }

  private getRegionalMultiplier(region: string): number {
    const regionalFactors: { [key: string]: number } = {
      'North America': 1.2, 'United States': 1.3, 'Canada': 1.0,
      'Europe': 1.1, 'United Kingdom': 1.2, 'Germany': 1.1, 'France': 1.0,
      'Asia Pacific': 1.0, 'Japan': 1.1, 'China': 0.9, 'India': 0.7, 'Australia': 1.0,
      'Latin America': 0.8, 'Brazil': 0.8,
      'Middle East & Africa': 0.7
    };
    return regionalFactors[region] || 1.0;
  }

  private getAverageUnitPrice(domain: string, category: string): number {
    const prices = {
      'e-commerce': {
        'Electronics': 800, 'Clothing': 150, 'Home & Garden': 200,
        'Sports': 100, 'Books': 25, 'Toys': 50
      },
      'saas': {
        'Enterprise Software': 5000, 'Developer Tools': 500, 'Marketing Automation': 1000,
        'Analytics': 2000, 'Communication': 300, 'Security': 3000
      },
      'manufacturing': {
        'Automotive Parts': 500, 'Industrial Equipment': 10000, 'Consumer Goods': 100,
        'Medical Devices': 5000, 'Aerospace Components': 20000, 'Electronics Components': 50
      }
    };

    return prices[domain as keyof typeof prices]?.[category as string] || 100;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private getCountryFromRegion(region: string): string {
    const regionCountryMap: { [key: string]: string } = {
      'North America': 'United States', 'United States': 'United States', 'Canada': 'Canada',
      'Europe': 'Germany', 'United Kingdom': 'United Kingdom', 'Germany': 'Germany', 'France': 'France',
      'Asia Pacific': 'Japan', 'Japan': 'Japan', 'China': 'China', 'India': 'India', 'Australia': 'Australia',
      'Latin America': 'Brazil', 'Brazil': 'Brazil',
      'Middle East & Africa': 'South Africa'
    };
    return regionCountryMap[region] || region;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(this.random() * array.length)];
  }

  private seededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }
}

/**
 * Predefined dataset configurations for common business scenarios
 */
export const DATASET_PRESETS = {
  'small-ecommerce': {
    recordCount: 1000,
    dateRange: {
      start: new Date('2023-01-01'),
      end: new Date('2023-12-31')
    },
    domains: ['e-commerce'],
    includeSeasonality: true,
    includeRegionalVariations: true,
    seed: 12345
  },
  'medium-saas': {
    recordCount: 5000,
    dateRange: {
      start: new Date('2022-01-01'),
      end: new Date('2023-12-31')
    },
    domains: ['saas'],
    includeSeasonality: false,
    includeRegionalVariations: true,
    seed: 54321
  },
  'large-manufacturing': {
    recordCount: 10000,
    dateRange: {
      start: new Date('2021-01-01'),
      end: new Date('2023-12-31')
    },
    domains: ['manufacturing'],
    includeSeasonality: true,
    includeRegionalVariations: true,
    seed: 98765
  },
  'mixed-enterprise': {
    recordCount: 15000,
    dateRange: {
      start: new Date('2020-01-01'),
      end: new Date('2023-12-31')
    },
    domains: ['e-commerce', 'saas', 'manufacturing'],
    includeSeasonality: true,
    includeRegionalVariations: true,
    seed: 13579
  }
} as const;
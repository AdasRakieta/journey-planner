import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface StopAttributes {
  id?: number;
  journeyId?: number;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  arrivalDate: Date;
  departureDate: Date;
  accommodationName?: string;
  accommodationUrl?: string;
  accommodationPrice?: number;
  accommodationCurrency?: string;
  notes?: string;
}

export interface TransportAttributes {
  id?: number;
  journeyId?: number;
  type: 'flight' | 'train' | 'bus' | 'car' | 'other';
  fromLocation: string;
  toLocation: string;
  departureDate: Date;
  arrivalDate: Date;
  price: number;
  currency: string;
  bookingUrl?: string;
  notes?: string;
}

export interface AttractionAttributes {
  id?: number;
  stopId?: number;
  name: string;
  description?: string;
  estimatedCost?: number;
  duration?: number; // in hours
}

export interface JourneyAttributes {
  id?: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  totalEstimatedCost?: number;
  currency: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface JourneyCreationAttributes extends Optional<JourneyAttributes, 'id' | 'createdAt' | 'updatedAt'> {}
interface StopCreationAttributes extends Optional<StopAttributes, 'id'> {}
interface TransportCreationAttributes extends Optional<TransportAttributes, 'id'> {}
interface AttractionCreationAttributes extends Optional<AttractionAttributes, 'id'> {}

// Journey Model
export class Journey extends Model<JourneyAttributes, JourneyCreationAttributes> implements JourneyAttributes {
  public id!: number;
  public title!: string;
  public description?: string;
  public startDate!: Date;
  public endDate!: Date;
  public totalEstimatedCost?: number;
  public currency!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Journey.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date', // Map to snake_case column
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_date', // Map to snake_case column
    },
    totalEstimatedCost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'total_estimated_cost', // Map to snake_case column
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'PLN',
    },
  },
  {
    sequelize,
    tableName: 'journeys',
    timestamps: true,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

// Stop Model
export class Stop extends Model<StopAttributes, StopCreationAttributes> implements StopAttributes {
  public id!: number;
  public journeyId!: number;
  public city!: string;
  public country!: string;
  public latitude!: number;
  public longitude!: number;
  public arrivalDate!: Date;
  public departureDate!: Date;
  public accommodationName?: string;
  public accommodationUrl?: string;
  public accommodationPrice?: number;
  public accommodationCurrency?: string;
  public notes?: string;
}

Stop.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    journeyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'journeys',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'journey_id', // Map to snake_case column
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
    },
    arrivalDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'arrival_date', // Map to snake_case column
    },
    departureDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'departure_date', // Map to snake_case column
    },
    accommodationName: {
      type: DataTypes.STRING,
      field: 'accommodation_name', // Map to snake_case column
    },
    accommodationUrl: {
      type: DataTypes.TEXT,
      field: 'accommodation_url', // Map to snake_case column
    },
    accommodationPrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'accommodation_price', // Map to snake_case column
    },
    accommodationCurrency: {
      type: DataTypes.STRING(3),
      field: 'accommodation_currency', // Map to snake_case column
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: 'stops',
    timestamps: false,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

// Transport Model
export class Transport extends Model<TransportAttributes, TransportCreationAttributes> implements TransportAttributes {
  public id!: number;
  public journeyId!: number;
  public type!: 'flight' | 'train' | 'bus' | 'car' | 'other';
  public fromLocation!: string;
  public toLocation!: string;
  public departureDate!: Date;
  public arrivalDate!: Date;
  public price!: number;
  public currency!: string;
  public bookingUrl?: string;
  public notes?: string;
}

Transport.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    journeyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'journeys',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'journey_id', // Map to snake_case column
    },
    type: {
      type: DataTypes.ENUM('flight', 'train', 'bus', 'car', 'other'),
      allowNull: false,
    },
    fromLocation: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'from_location', // Map to snake_case column
    },
    toLocation: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'to_location', // Map to snake_case column
    },
    departureDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'departure_date', // Map to snake_case column
    },
    arrivalDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'arrival_date', // Map to snake_case column
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'PLN',
    },
    bookingUrl: {
      type: DataTypes.TEXT,
      field: 'booking_url', // Map to snake_case column
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: 'transports',
    timestamps: false,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

// Attraction Model
export class Attraction extends Model<AttractionAttributes, AttractionCreationAttributes> implements AttractionAttributes {
  public id!: number;
  public stopId!: number;
  public name!: string;
  public description?: string;
  public estimatedCost?: number;
  public duration?: number;
}

Attraction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    stopId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'stops',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'stop_id', // Map to snake_case column
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    estimatedCost: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'estimated_cost', // Map to snake_case column
    },
    duration: {
      type: DataTypes.INTEGER, // in hours
    },
  },
  {
    sequelize,
    tableName: 'attractions',
    timestamps: false,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

// Define associations
Journey.hasMany(Stop, { foreignKey: 'journeyId', as: 'stops' });
Stop.belongsTo(Journey, { foreignKey: 'journeyId' });

Journey.hasMany(Transport, { foreignKey: 'journeyId', as: 'transports' });
Transport.belongsTo(Journey, { foreignKey: 'journeyId' });

Stop.hasMany(Attraction, { foreignKey: 'stopId', as: 'attractions' });
Attraction.belongsTo(Stop, { foreignKey: 'stopId' });

export default Journey;


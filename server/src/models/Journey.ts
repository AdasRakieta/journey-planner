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
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    totalEstimatedCost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
    },
  },
  {
    sequelize,
    tableName: 'journeys',
    timestamps: true,
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
    },
    departureDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    accommodationName: {
      type: DataTypes.STRING,
    },
    accommodationUrl: {
      type: DataTypes.TEXT,
    },
    accommodationPrice: {
      type: DataTypes.DECIMAL(10, 2),
    },
    accommodationCurrency: {
      type: DataTypes.STRING(3),
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: 'stops',
    timestamps: false,
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
    },
    type: {
      type: DataTypes.ENUM('flight', 'train', 'bus', 'car', 'other'),
      allowNull: false,
    },
    fromLocation: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    toLocation: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    departureDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    arrivalDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
    },
    bookingUrl: {
      type: DataTypes.TEXT,
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: 'transports',
    timestamps: false,
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
    },
    duration: {
      type: DataTypes.INTEGER, // in hours
    },
  },
  {
    sequelize,
    tableName: 'attractions',
    timestamps: false,
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


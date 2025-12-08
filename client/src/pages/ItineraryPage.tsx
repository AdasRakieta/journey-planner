import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  GripVertical,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  RotateCcw,
  Filter,
  Check,
  Map,
  Sparkles,
  CalendarDays,
  List,
  Navigation
} from 'lucide-react';
import { journeyService, attractionService } from '../services/api';
import type { Journey, Stop, Attraction } from '../types/journey';
import { useToast, ToastContainer } from '../components/Toast';
import JourneyMapWrapper from '../components/JourneyMapWrapper';
import { getAttractionTagInfo } from '../utils/attractionTags';

// Priority configuration with colors and labels
const PRIORITY_CONFIG = {
  must: { 
    label: 'Obowiązkowe', 
    shortLabel: 'Must',
    color: 'bg-red-500 dark:bg-[#ff453a]', 
    textColor: 'text-red-600 dark:text-[#ff453a]',
    bgLight: 'bg-red-50 dark:bg-[#ff453a]/10',
    borderColor: 'border-red-300 dark:border-[#ff453a]/30'
  },
  should: { 
    label: 'Ważne', 
    shortLabel: 'Should',
    color: 'bg-orange-500 dark:bg-[#ff9f0a]', 
    textColor: 'text-orange-600 dark:text-[#ff9f0a]',
    bgLight: 'bg-orange-50 dark:bg-[#ff9f0a]/10',
    borderColor: 'border-orange-300 dark:border-[#ff9f0a]/30'
  },
  could: { 
    label: 'Opcjonalne', 
    shortLabel: 'Could',
    color: 'bg-blue-500 dark:bg-[#0a84ff]', 
    textColor: 'text-blue-600 dark:text-[#0a84ff]',
    bgLight: 'bg-blue-50 dark:bg-[#0a84ff]/10',
    borderColor: 'border-blue-300 dark:border-[#0a84ff]/30'
  },
  skip: { 
    label: 'Pomiń', 
    shortLabel: 'Skip',
    color: 'bg-gray-400 dark:bg-[#636366]', 
    textColor: 'text-gray-500 dark:text-[#636366]',
    bgLight: 'bg-gray-100 dark:bg-[#636366]/10',
    borderColor: 'border-gray-300 dark:border-[#636366]/30'
  },
};

type PriorityType = keyof typeof PRIORITY_CONFIG;

// Format date for display
const formatDateForDisplay = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Format date key YYYY-MM-DD
const formatDateKey = (date: Date | string): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Optimize route using nearest neighbor algorithm (TSP approximation)
const optimizeRoute = (attractions: Attraction[], startLat?: number, startLon?: number): Attraction[] => {
  if (attractions.length <= 1) return attractions;
  
  const withCoords = attractions.filter(a => a.latitude && a.longitude);
  const withoutCoords = attractions.filter(a => !a.latitude || !a.longitude);
  
  if (withCoords.length === 0) return attractions;
  
  const optimized: Attraction[] = [];
  const remaining = [...withCoords];
  
  // Start from accommodation or first attraction
  let currentLat = startLat || withCoords[0].latitude!;
  let currentLon = startLon || withCoords[0].longitude!;
  
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    
    remaining.forEach((attr, index) => {
      const dist = calculateDistance(currentLat, currentLon, attr.latitude!, attr.longitude!);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = index;
      }
    });
    
    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    currentLat = nearest.latitude!;
    currentLon = nearest.longitude!;
  }
  
  // Add attractions without coordinates at the end
  return [...optimized, ...withoutCoords];
};

// Priority Badge Component
const PriorityBadge: React.FC<{ priority?: PriorityType; compact?: boolean }> = ({ priority, compact }) => {
  if (!priority || priority === 'should') return null; // 'should' is default, don't show
  
  const config = PRIORITY_CONFIG[priority];
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgLight} ${config.textColor} ${config.borderColor} border`}>
      {priority === 'must' && <Star size={10} className="mr-1" />}
      {priority === 'skip' && <AlertTriangle size={10} className="mr-1" />}
      {compact ? config.shortLabel : config.label}
    </span>
  );
};

// Draggable Attraction Card Component
const AttractionCard: React.FC<{
  attraction: Attraction;
  stop?: Stop;
  onPriorityChange: (id: number, priority: PriorityType) => void;
  onPlannedDateChange?: (id: number, date: string | null) => void;
  onDragStart: (e: React.DragEvent, attraction: Attraction) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
  isDropTarget?: boolean;
}> = ({ attraction, stop, onPriorityChange, onPlannedDateChange, onDragStart, onDragEnd, isDragging, isDropTarget }) => {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  
  const currentPriority = attraction.priority || 'should';
  const config = PRIORITY_CONFIG[currentPriority];
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, attraction)}
      onDragEnd={onDragEnd}
      className={`
        group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDropTarget ? 'border-blue-500 dark:border-[#0a84ff] bg-blue-50 dark:bg-[#0a84ff]/10' : ''}
        ${currentPriority === 'skip' 
          ? 'bg-gray-50 dark:bg-[#1c1c1e]/50 border-gray-200 dark:border-[#38383a]/50 opacity-60' 
          : 'bg-white dark:bg-[#2c2c2e] border-gray-200 dark:border-[#38383a]'}
        hover:border-gray-300 dark:hover:border-[#48484a] cursor-grab active:cursor-grabbing
      `}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0 pt-1 text-gray-400 dark:text-[#636366] opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={16} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-medium truncate ${currentPriority === 'skip' ? 'line-through text-gray-500 dark:text-[#636366]' : 'text-gray-900 dark:text-white'}`}>
                {attraction.name}
              </h4>
              {attraction.tag && (() => {
                const tagInfo = getAttractionTagInfo(attraction.tag);
                return tagInfo && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0"
                    style={{
                      backgroundColor: `${tagInfo.color}20`,
                      color: tagInfo.color,
                      border: `1px solid ${tagInfo.color}40`
                    }}
                  >
                    {tagInfo.emoji} {tagInfo.label}
                  </span>
                );
              })()}
            </div>
            {attraction.description && (
              <p className="text-sm text-gray-500 dark:text-[#8e8e93] line-clamp-2 mt-0.5">
                {attraction.description}
              </p>
            )}
          </div>
          
          {/* Priority Badge & Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPriorityMenu(!showPriorityMenu);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors
                ${config.bgLight} ${config.textColor} hover:opacity-80`}
            >
              {config.shortLabel}
              <ChevronDown size={12} />
            </button>
            
            {showPriorityMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowPriorityMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-white dark:bg-[#2c2c2e] rounded-lg shadow-lg border border-gray-200 dark:border-[#38383a] py-1 overflow-hidden">
                  {(Object.keys(PRIORITY_CONFIG) as PriorityType[]).map((key) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPriorityChange(attraction.id!, key);
                        setShowPriorityMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors
                        ${currentPriority === key ? 'bg-gray-50 dark:bg-[#3a3a3c]' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[key].color}`} />
                      <span className="text-gray-900 dark:text-white">{PRIORITY_CONFIG[key].label}</span>
                      {currentPriority === key && (
                        <Check size={14} className="ml-auto text-green-500 dark:text-[#30d158]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Meta info */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-[#8e8e93]">
          {attraction.plannedDate && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-[#0a84ff]/20 text-blue-600 dark:text-[#0a84ff] font-medium">
              📅 {new Date(attraction.plannedDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {attraction.duration && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {attraction.duration}
            </span>
          )}
          {attraction.plannedTime && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {attraction.plannedTime}
            </span>
          )}
          {attraction.estimatedCost && attraction.estimatedCost > 0 && (
            <span className="text-green-600 dark:text-[#30d158]">
              {attraction.estimatedCost} {attraction.currency || 'PLN'}
            </span>
          )}
        </div>
        
        {/* Planned Date Picker (for multi-day stops) */}
        {stop && onPlannedDateChange && (() => {
          const stopArrival = new Date(stop.arrivalDate);
          const stopDeparture = new Date(stop.departureDate);
          const daysDiff = Math.ceil((stopDeparture.getTime() - stopArrival.getTime()) / (1000 * 60 * 60 * 24));
          
          // Only show date picker if stop is multi-day (2+ days)
          if (daysDiff >= 1) {
            return (
              <div className="mt-2">
                <label className="block text-xs text-gray-600 dark:text-[#8e8e93] mb-1">
                  📅 Dzień w {stop.city}
                </label>
                <input
                  type="date"
                  value={attraction.plannedDate || ''}
                  onChange={(e) => {
                    e.stopPropagation();
                    onPlannedDateChange(attraction.id!, e.target.value || null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  min={formatDateKey(stop.arrivalDate)}
                  max={formatDateKey(stop.departureDate)}
                  className="max-w-[160px] px-2 py-1 text-xs rounded border border-gray-300 dark:border-[#48484a] bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-[#0a84ff] focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#0a84ff]"
                />
                {attraction.plannedDate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlannedDateChange(attraction.id!, null);
                    }}
                    className="mt-1 text-xs text-gray-500 dark:text-[#8e8e93] hover:text-red-600 dark:hover:text-[#ff453a]"
                  >
                    Wyczyść datę
                  </button>
                )}
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
};

// Stop Section Component with droppable area
const StopSection: React.FC<{
  stop: Stop;
  attractions: Attraction[];
  isExpanded: boolean;
  onToggle: () => void;
  onPriorityChange: (attractionId: number, priority: PriorityType) => void;
  onPlannedDateChange: (attractionId: number, date: string | null) => void;
  onDragStart: (e: React.DragEvent, attraction: Attraction) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stopId: number, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  draggingAttraction: Attraction | null;
  dragOverStopId: number | null;
  onOptimize: (stopId: number) => void;
  onShowMap: (stopId: number) => void;
}> = ({
  stop,
  attractions,
  isExpanded,
  onToggle,
  onPriorityChange,
  onPlannedDateChange,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  draggingAttraction,
  dragOverStopId,
  onOptimize,
  onShowMap
}) => {
  const sortedAttractions = [...attractions].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const isDropTarget = dragOverStopId === stop.id;
  
  // Count by priority
  const mustCount = sortedAttractions.filter(a => a.priority === 'must').length;
  const skipCount = sortedAttractions.filter(a => a.priority === 'skip').length;
  
  // Check if attractions have coordinates
  const hasCoordinates = sortedAttractions.some(a => a.latitude && a.longitude);
  
  // Calculate days in stop
  const stopArrival = new Date(stop.arrivalDate);
  const stopDeparture = new Date(stop.departureDate);
  const daysDiff = Math.ceil((stopDeparture.getTime() - stopArrival.getTime()) / (1000 * 60 * 60 * 24));
  const daysCount = daysDiff + 1; // Include arrival day
  
  return (
    <div 
      className={`rounded-xl border transition-all duration-200 ${
        isDropTarget 
          ? 'border-blue-500 dark:border-[#0a84ff] shadow-md' 
          : 'border-gray-200 dark:border-[#38383a]'
      } bg-white dark:bg-[#2c2c2e]`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDrop={(e) => onDrop(e, stop.id!, sortedAttractions.length)}
    >
      {/* Stop Header */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 hover:bg-gray-50 dark:hover:bg-[#3a3a3c] transition-colors rounded-lg p-2 -m-2"
        >
          <div className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
            <ChevronRight size={20} className="text-gray-500 dark:text-[#8e8e93]" />
          </div>
          
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-[#0a84ff]/20 flex items-center justify-center">
            <MapPin size={18} className="text-blue-600 dark:text-[#0a84ff]" />
          </div>
          
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {stop.city}
              {daysCount > 1 && (
                <span className="ml-2 text-sm font-normal text-blue-600 dark:text-[#0a84ff]">
                  ({daysCount} {daysCount === 2 ? 'dni' : daysCount === 3 ? 'dni' : daysCount === 4 ? 'dni' : 'dni'})
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#8e8e93]">
              {stop.country} • {formatDateForDisplay(stop.arrivalDate)} - {formatDateForDisplay(stop.departureDate)}
            </p>
          </div>
          
          {/* Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {mustCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-50 dark:bg-[#ff453a]/10 text-red-600 dark:text-[#ff453a]">
                {mustCount} must
              </span>
            )}
            {skipCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-[#636366]/10 text-gray-500 dark:text-[#636366]">
                {skipCount} skip
              </span>
            )}
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93]">
              {sortedAttractions.length} atrakcji
            </span>
          </div>
        </button>
        
        {/* Action buttons */}
        {isExpanded && sortedAttractions.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasCoordinates && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOptimize(stop.id!);
                  }}
                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-[#0a84ff]/20 text-blue-600 dark:text-[#0a84ff] transition-colors"
                  title="Optymalizuj trasę"
                >
                  <Sparkles size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowMap(stop.id!);
                  }}
                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-[#0a84ff]/20 text-blue-600 dark:text-[#0a84ff] transition-colors"
                  title="Pokaż na mapie"
                >
                  <Navigation size={18} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Attractions List */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {sortedAttractions.length === 0 ? (
            <div 
              className={`py-8 text-center rounded-lg border-2 border-dashed transition-colors ${
                isDropTarget 
                  ? 'border-blue-500 dark:border-[#0a84ff] bg-blue-50 dark:bg-[#0a84ff]/10' 
                  : 'border-gray-200 dark:border-[#38383a]'
              }`}
            >
              <p className="text-gray-500 dark:text-[#8e8e93]">
                {isDropTarget ? 'Upuść tutaj' : 'Brak atrakcji. Przeciągnij tutaj lub dodaj w widoku głównym.'}
              </p>
            </div>
          ) : (
            <>
              {sortedAttractions.map((attraction, index) => (
                <div
                  key={attraction.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    onDrop(e, stop.id!, index);
                  }}
                >
                  <AttractionCard
                    attraction={attraction}
                    stop={stop}
                    onPriorityChange={onPriorityChange}
                    onPlannedDateChange={onPlannedDateChange}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isDragging={draggingAttraction?.id === attraction.id}
                    isDropTarget={false}
                  />
                </div>
              ))}
              
              {/* Drop zone at the end */}
              {isDropTarget && draggingAttraction && !sortedAttractions.find(a => a.id === draggingAttraction.id) && (
                <div className="py-2 text-center rounded-lg border-2 border-dashed border-blue-500 dark:border-[#0a84ff] bg-blue-50 dark:bg-[#0a84ff]/10">
                  <p className="text-sm text-blue-600 dark:text-[#0a84ff]">Upuść tutaj</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Main Itinerary Page Component
const ItineraryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [attractionsByStop, setAttractionsByStop] = useState<Record<number, Attraction[]>>({});
  const [expandedStops, setExpandedStops] = useState<Set<number>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  
  // Drag and drop state
  const [draggingAttraction, setDraggingAttraction] = useState<Attraction | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<number | null>(null);
  
  // Filter state
  const [filterPriority, setFilterPriority] = useState<PriorityType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // View mode: 'list' | 'map' | 'daily'
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'daily'>('list');
  
  // Selected stop for map view
  const [selectedStopForMap, setSelectedStopForMap] = useState<number | null>(null);

  // Load journey data
  const loadData = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const journeyData = await journeyService.getJourneyById(parseInt(id));
      setJourney(journeyData);
      
      const stopsData = journeyData.stops || [];
      setStops(stopsData.sort((a: Stop, b: Stop) => 
        new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
      ));
      
      // Load attractions for each stop
      const attractionsMap: Record<number, Attraction[]> = {};
      for (const stop of stopsData) {
        if (stop.id) {
          const attractions = stop.attractions || [];
          attractionsMap[stop.id] = attractions.sort((a: Attraction, b: Attraction) => 
            (a.orderIndex || 0) - (b.orderIndex || 0)
          );
        }
      }
      setAttractionsByStop(attractionsMap);
      
      // Expand all stops by default
      setExpandedStops(new Set(stopsData.map((s: Stop) => s.id!)));
      
    } catch (error) {
      console.error('Error loading journey:', error);
      toast.error('Nie udało się załadować podróży');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // 'toast' intentionally omitted to prevent infinite re-render loop

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle priority change
  const handlePriorityChange = useCallback((attractionId: number, priority: PriorityType) => {
    setAttractionsByStop(prev => {
      const updated = { ...prev };
      for (const stopId of Object.keys(updated)) {
        updated[parseInt(stopId)] = updated[parseInt(stopId)].map(attr =>
          attr.id === attractionId ? { ...attr, priority } : attr
        );
      }
      return updated;
    });
    setHasChanges(true);
  }, []);

  // Handle planned date change
  const handlePlannedDateChange = useCallback(async (attractionId: number, plannedDate: string | null) => {
    setAttractionsByStop(prev => {
      const updated = { ...prev };
      for (const stopId of Object.keys(updated)) {
        updated[parseInt(stopId)] = updated[parseInt(stopId)].map(attr =>
          attr.id === attractionId ? { ...attr, plannedDate: plannedDate || undefined } : attr
        );
      }
      return updated;
    });
    
    // Save immediately to backend
    try {
      await attractionService.bulkUpdateAttractions([{
        id: attractionId,
        plannedDate: plannedDate || undefined
      }]);
      toast.success('Data zapisana');
    } catch (error) {
      console.error('Error saving planned date:', error);
      toast.error('Nie udało się zapisać daty');
    }
  }, [toast]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, attraction: Attraction) => {
    setDraggingAttraction(attraction);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingAttraction(null);
    setDragOverStopId(null);
  }, []);

  const handleDragOver = useCallback((stopId: number) => {
    setDragOverStopId(stopId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStopId: number, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggingAttraction) return;
    
    const sourceStopId = draggingAttraction.stopId;
    
    setAttractionsByStop(prev => {
      const updated = { ...prev };
      
      // Remove from source
      if (sourceStopId && updated[sourceStopId]) {
        updated[sourceStopId] = updated[sourceStopId].filter(a => a.id !== draggingAttraction.id);
        // Reindex source
        updated[sourceStopId] = updated[sourceStopId].map((a, i) => ({ ...a, orderIndex: i }));
      }
      
      // Add to target
      if (!updated[targetStopId]) {
        updated[targetStopId] = [];
      }
      
      const movedAttraction = { ...draggingAttraction, stopId: targetStopId, orderIndex: targetIndex };
      
      // Insert at target index
      const targetAttractions = [...updated[targetStopId]];
      targetAttractions.splice(targetIndex, 0, movedAttraction);
      
      // Reindex target
      updated[targetStopId] = targetAttractions.map((a, i) => ({ ...a, orderIndex: i }));
      
      return updated;
    });
    
    setHasChanges(true);
    setDraggingAttraction(null);
    setDragOverStopId(null);
  }, [draggingAttraction]);

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Array<{
        id: number;
        orderIndex: number;
        priority: PriorityType;
        stopId: number;
      }> = [];
      
      for (const [stopId, attractions] of Object.entries(attractionsByStop)) {
        for (const attr of attractions) {
          if (attr.id) {
            updates.push({
              id: attr.id,
              orderIndex: attr.orderIndex || 0,
              priority: attr.priority || 'should',
              stopId: parseInt(stopId)
            });
          }
        }
      }
      
      await attractionService.bulkUpdateAttractions(updates);
      toast.success('Zmiany zostały zapisane');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    loadData();
    setHasChanges(false);
  };

  // Toggle stop expansion
  const toggleStop = (stopId: number) => {
    setExpandedStops(prev => {
      const next = new Set(prev);
      if (next.has(stopId)) {
        next.delete(stopId);
      } else {
        next.add(stopId);
      }
      return next;
    });
  };

  // Filter attractions
  const getFilteredAttractions = (attractions: Attraction[]) => {
    if (filterPriority === 'all') return attractions;
    return attractions.filter(a => (a.priority || 'should') === filterPriority);
  };
  
  // Optimize route for a stop
  const handleOptimizeRoute = (stopId: number) => {
    const stop = stops.find(s => s.id === stopId);
    if (!stop) return;
    
    const attractions = attractionsByStop[stopId] || [];
    const optimized = optimizeRoute(attractions, stop.latitude, stop.longitude);
    
    setAttractionsByStop(prev => ({
      ...prev,
      [stopId]: optimized.map((a, i) => ({ ...a, orderIndex: i }))
    }));
    setHasChanges(true);
    toast.success(`Zoptymalizowano trasę dla ${stop.city}`);
  };
  
  // Group attractions by date
  const getAttractionsByDate = () => {
    const byDate: Record<string, Array<{ stop: Stop; attraction: Attraction }>> = {};
    
    stops.forEach(stop => {
      const attractions = attractionsByStop[stop.id!] || [];
      
      attractions.forEach(attr => {
        // Use planned date if available, otherwise use stop arrival date
        const dateKey = attr.plannedDate 
          ? formatDateKey(attr.plannedDate)
          : formatDateKey(stop.arrivalDate);
        
        if (!byDate[dateKey]) {
          byDate[dateKey] = [];
        }
        byDate[dateKey].push({ stop, attraction: attr });
      });
    });
    
    return byDate;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600 dark:text-[#8e8e93]">
          <Loader2 size={24} className="animate-spin" />
          <span>Ładowanie harmonogramu...</span>
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-[#8e8e93] mb-4">Nie znaleziono podróży</p>
          <Link to="/" className="gh-btn-primary">
            Wróć do listy
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e]">
      <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#2c2c2e] border-b border-gray-200 dark:border-[#38383a] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back button and title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/"
                className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-[#8e8e93]" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {journey.title}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[#8e8e93]">
                  Harmonogram podróży
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View mode toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-[#3a3a3c] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-[#0a84ff] shadow-sm' 
                      : 'text-gray-600 dark:text-[#8e8e93] hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Widok listy"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('daily')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'daily' 
                      ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-[#0a84ff] shadow-sm' 
                      : 'text-gray-600 dark:text-[#8e8e93] hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Widok dzienny"
                >
                  <CalendarDays size={18} />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'map' 
                      ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-[#0a84ff] shadow-sm' 
                      : 'text-gray-600 dark:text-[#8e8e93] hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Widok mapy"
                >
                  <Map size={18} />
                </button>
              </div>
              
              {/* Filter button */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-colors ${
                    filterPriority !== 'all' 
                      ? 'bg-blue-100 dark:bg-[#0a84ff]/20 text-blue-600 dark:text-[#0a84ff]' 
                      : 'hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93]'
                  }`}
                >
                  <Filter size={20} />
                </button>
                
                {showFilters && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                    <div className="absolute right-0 top-full mt-2 z-20 w-44 bg-white dark:bg-[#2c2c2e] rounded-lg shadow-lg border border-gray-200 dark:border-[#38383a] py-1 overflow-hidden">
                      <button
                        onClick={() => { setFilterPriority('all'); setShowFilters(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3a3a3c] ${
                          filterPriority === 'all' ? 'bg-gray-50 dark:bg-[#3a3a3c]' : ''
                        }`}
                      >
                        <span className="text-gray-900 dark:text-white">Wszystkie</span>
                        {filterPriority === 'all' && <Check size={14} className="ml-auto text-green-500" />}
                      </button>
                      {(Object.keys(PRIORITY_CONFIG) as PriorityType[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => { setFilterPriority(key); setShowFilters(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3a3a3c] ${
                            filterPriority === key ? 'bg-gray-50 dark:bg-[#3a3a3c]' : ''
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[key].color}`} />
                          <span className="text-gray-900 dark:text-white">{PRIORITY_CONFIG[key].label}</span>
                          {filterPriority === key && <Check size={14} className="ml-auto text-green-500" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {/* Reset button */}
              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors text-gray-600 dark:text-[#8e8e93]"
                  title="Cofnij zmiany"
                >
                  <RotateCcw size={20} />
                </button>
              )}
              
              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  hasChanges 
                    ? 'bg-green-600 hover:bg-green-700 dark:bg-[#30d158] dark:hover:bg-green-600 text-white' 
                    : 'bg-gray-200 dark:bg-[#3a3a3c] text-gray-500 dark:text-[#636366] cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span className="hidden sm:inline">Zapisz</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Info banner */}
        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-[#0a84ff]/10 border border-blue-200 dark:border-[#0a84ff]/30">
          <p className="text-sm text-blue-800 dark:text-[#0a84ff]">
            <strong>Wskazówka:</strong> Przeciągaj atrakcje aby zmienić kolejność lub przenieść między przystankami. 
            Ustaw priorytety aby łatwo zidentyfikować co pominąć gdy zabraknie czasu.
          </p>
        </div>
        
        {/* Priority legend */}
        <div className="mb-6 flex flex-wrap gap-3">
          {(Object.keys(PRIORITY_CONFIG) as PriorityType[]).map((key) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${PRIORITY_CONFIG[key].color}`} />
              <span className="text-gray-600 dark:text-[#8e8e93]">{PRIORITY_CONFIG[key].label}</span>
            </div>
          ))}
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {stops.length === 0 ? (
              <div className="text-center py-12">
                <MapPin size={48} className="mx-auto mb-4 text-gray-300 dark:text-[#48484a]" />
                <p className="text-gray-500 dark:text-[#8e8e93]">
                  Brak przystanków w tej podróży
                </p>
                <Link to="/" className="text-blue-600 dark:text-[#0a84ff] hover:underline mt-2 inline-block">
                  Dodaj przystanki w widoku głównym
                </Link>
              </div>
            ) : (
              stops.map((stop) => (
                <StopSection
                  key={stop.id}
                  stop={stop}
                  attractions={getFilteredAttractions(attractionsByStop[stop.id!] || [])}
                  isExpanded={expandedStops.has(stop.id!)}
                  onToggle={() => toggleStop(stop.id!)}
                  onPriorityChange={handlePriorityChange}
                  onPlannedDateChange={handlePlannedDateChange}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  onDragOver={() => handleDragOver(stop.id!)}
                  draggingAttraction={draggingAttraction}
                  dragOverStopId={dragOverStopId}
                  onOptimize={handleOptimizeRoute}
                  onShowMap={(stopId) => {
                    setSelectedStopForMap(stopId);
                    setViewMode('map');
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* Daily View */}
        {viewMode === 'daily' && (
          <div className="space-y-6">
            {(() => {
              const byDate = getAttractionsByDate();
              const sortedDates = Object.keys(byDate).sort();
              
              if (sortedDates.length === 0) {
                return (
                  <div className="text-center py-12">
                    <CalendarDays size={48} className="mx-auto mb-4 text-gray-300 dark:text-[#48484a]" />
                    <p className="text-gray-500 dark:text-[#8e8e93]">Brak zaplanowanych atrakcji</p>
                  </div>
                );
              }
              
              return sortedDates.map(dateKey => {
                const items = byDate[dateKey];
                const date = new Date(dateKey);
                
                return (
                  <div key={dateKey} className="gh-card">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-[#0a84ff]/20 flex items-center justify-center">
                        <Calendar size={24} className="text-blue-600 dark:text-[#0a84ff]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-[#8e8e93]">
                          {items.length} {items.length === 1 ? 'attraction' : 'attractions'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {items.map(({ stop, attraction }) => {
                        const stopArrival = new Date(stop.arrivalDate);
                        const stopDeparture = new Date(stop.departureDate);
                        const daysDiff = Math.ceil((stopDeparture.getTime() - stopArrival.getTime()) / (1000 * 60 * 60 * 24));
                        const isMultiDay = daysDiff >= 1;
                        
                        return (
                          <div
                            key={attraction.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#38383a]"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-[#0a84ff]/20 flex items-center justify-center">
                              <MapPin size={16} className="text-blue-600 dark:text-[#0a84ff]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium text-gray-900 dark:text-white">{attraction.name}</h4>
                                  {attraction.tag && (() => {
                                    const tagInfo = getAttractionTagInfo(attraction.tag);
                                    return tagInfo && (
                                      <span 
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0"
                                        style={{
                                          backgroundColor: `${tagInfo.color}20`,
                                          color: tagInfo.color,
                                          border: `1px solid ${tagInfo.color}40`
                                        }}
                                      >
                                        {tagInfo.emoji} {tagInfo.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <PriorityBadge priority={attraction.priority as PriorityType} compact />
                              </div>
                              <p className="text-sm text-gray-500 dark:text-[#8e8e93]">
                                📍 {stop.city}, {stop.country}
                              </p>
                              {attraction.plannedTime && (
                                <p className="text-sm text-gray-600 dark:text-[#8e8e93] mt-1">
                                  🕐 {attraction.plannedTime}
                                </p>
                              )}
                              {attraction.duration && (
                                <p className="text-sm text-gray-600 dark:text-[#8e8e93]">
                                  ⏱️ {attraction.duration}
                                </p>
                              )}
                              
                              {/* Inline date picker for multi-day stops */}
                              {isMultiDay && (
                                <div className="mt-2">
                                  <label className="block text-xs text-gray-600 dark:text-[#8e8e93] mb-1">
                                    Zmień dzień:
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="date"
                                      value={attraction.plannedDate || ''}
                                      onChange={(e) => handlePlannedDateChange(attraction.id!, e.target.value || null)}
                                      min={formatDateKey(stop.arrivalDate)}
                                      max={formatDateKey(stop.departureDate)}
                                      className="max-w-[160px] px-2 py-1 text-xs rounded border border-gray-300 dark:border-[#48484a] bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-[#0a84ff] focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#0a84ff]"
                                    />
                                    {attraction.plannedDate && (
                                      <button
                                        onClick={() => handlePlannedDateChange(attraction.id!, null)}
                                        className="text-xs text-gray-500 dark:text-[#8e8e93] hover:text-red-600 dark:hover:text-[#ff453a] px-2 py-1"
                                        title="Wyczyść datę"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="space-y-4">
            {/* Stop selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedStopForMap(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStopForMap === null
                    ? 'bg-blue-600 dark:bg-[#0a84ff] text-white'
                    : 'bg-gray-100 dark:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93] hover:bg-gray-200 dark:hover:bg-[#48484a]'
                }`}
              >
                Wszystkie przystanki
              </button>
              {stops.map(stop => (
                <button
                  key={stop.id}
                  onClick={() => setSelectedStopForMap(stop.id!)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStopForMap === stop.id
                      ? 'bg-blue-600 dark:bg-[#0a84ff] text-white'
                      : 'bg-gray-100 dark:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93] hover:bg-gray-200 dark:hover:bg-[#48484a]'
                  }`}
                >
                  {stop.city}
                </button>
              ))}
            </div>
            
            {/* Map container */}
            <div className="h-[600px] rounded-xl overflow-hidden border border-gray-200 dark:border-[#38383a]">
              <JourneyMapWrapper
                locations={selectedStopForMap 
                  ? stops.filter(s => s.id === selectedStopForMap).map(s => ({
                      ...s,
                      lat: s.latitude,
                      lng: s.longitude,
                      attractions: (attractionsByStop[s.id!] || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                    }))
                  : stops.map(s => ({
                      ...s,
                      lat: s.latitude,
                      lng: s.longitude,
                      attractions: (attractionsByStop[s.id!] || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                    }))
                }
                center={selectedStopForMap 
                  ? stops.find(s => s.id === selectedStopForMap) 
                    ? [stops.find(s => s.id === selectedStopForMap)!.latitude, stops.find(s => s.id === selectedStopForMap)!.longitude]
                    : undefined
                  : undefined
                }
                zoom={selectedStopForMap ? 14 : 6}
              />
            </div>
            
            {/* Legend for selected stop */}
            {selectedStopForMap && (() => {
              const stop = stops.find(s => s.id === selectedStopForMap);
              const attractions = (attractionsByStop[selectedStopForMap] || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
              
              if (!stop || attractions.length === 0) return null;
              
              return (
                <div className="gh-card">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Trasa dla {stop.city}
                  </h3>
                  <div className="space-y-2">
                    {attractions.map((attr, index) => (
                      <div key={attr.id} className="flex items-center gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 dark:bg-[#0a84ff] text-white flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="text-gray-900 dark:text-white">{attr.name}</span>
                        {attr.plannedTime && (
                          <span className="text-gray-500 dark:text-[#8e8e93] ml-auto">{attr.plannedTime}</span>
                        )}
                        <PriorityBadge priority={attr.priority as PriorityType} compact />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
};

export default ItineraryPage;

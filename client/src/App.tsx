import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, DollarSign, Plane, Train, Bus, Car, Menu, X, Trash2, Edit2, CheckCircle2, XCircle, Settings, LogOut, User, Users, Share2, Navigation } from 'lucide-react';
import JourneyMap from './components/JourneyMap';
import { PaymentCheckbox } from './components/PaymentCheckbox';
import { ToastContainer, useToast } from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import { useConfirm } from './hooks/useConfirm';
import type { Journey, Stop, Transport, Attraction } from './types/journey';
import { journeyService, stopService, attractionService, transportService, journeyShareService } from './services/api';
import { socketService } from './services/socket';
import { getPaymentSummary, calculateAmountDue } from './utils/paymentCalculations';
import { useAuth } from './contexts/AuthContext';
import { geocodeAddress } from './services/geocoding';

// Helper function to format date to YYYY-MM-DD
const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

// Helper function to format datetime for datetime-local input
const formatDateTimeForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  // Format: YYYY-MM-DDTHH:MM
  return d.toISOString().slice(0, 16);
};

// Helper function to format time for time input (HH:MM)
const formatTimeForInput = (time: string | undefined): string => {
  if (!time) return '';
  // If it's already in HH:MM format, return as is
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  // Otherwise, try to parse and format
  const match = time.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
};

// Helper function to format date for display
const formatDateForDisplay = (date: Date | string | undefined): string => {
  if (!date) return 'Not set';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

function App() {
  const { user, logout } = useAuth();
  const { toasts, closeToast, success, error, warning, info } = useToast();
  const confirm = useConfirm();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [showNewJourneyForm, setShowNewJourneyForm] = useState(false);
  const [showStopForm, setShowStopForm] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');
  
  const [newJourney, setNewJourney] = useState<Partial<Journey>>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    currency: 'PLN',
    stops: [],
    transports: [],
  });

  const [newStop, setNewStop] = useState<Partial<Stop>>({
    city: '',
    country: '',
    latitude: 51.505,
    longitude: -0.09,
    arrivalDate: '',
    departureDate: '',
    accommodationName: '',
    accommodationUrl: '',
    accommodationPrice: 0,
    accommodationCurrency: 'PLN',
  });

  const [newTransport, setNewTransport] = useState<Partial<Transport>>({
    type: 'flight',
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    arrivalDate: '',
    price: 0,
    currency: 'PLN',
    bookingUrl: '',
    flightNumber: '',
    trainNumber: '',
  });

  const [newAttraction, setNewAttraction] = useState<Partial<Attraction>>({
    name: '',
    description: '',
    estimatedCost: 0,
    duration: '',
  });
  const [geocodingAttraction, setGeocodingAttraction] = useState(false);

  const [selectedStopForAttraction, setSelectedStopForAttraction] = useState<number | null>(null);
  const [showAttractionForm, setShowAttractionForm] = useState(false);

  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [showEditStopForm, setShowEditStopForm] = useState(false);
  
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [showEditTransportForm, setShowEditTransportForm] = useState(false);
  
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [showEditAttractionForm, setShowEditAttractionForm] = useState(false);
  const [editingAttractionStopId, setEditingAttractionStopId] = useState<number | null>(null);
  const [geocodingEditAttraction, setGeocodingEditAttraction] = useState(false);

  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [showEditJourneyForm, setShowEditJourneyForm] = useState(false);

  // Share journey state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmailOrUsername, setShareEmailOrUsername] = useState('');

  useEffect(() => {
    // Only load journeys if user is authenticated
    if (user) {
      void loadJourneys();
    }
    
    // Connect to Socket.IO for real-time updates
    socketService.connect();
    
    // Listen for journey events
    socketService.on('journey:created', (journey: Journey) => {
      console.log('Real-time: Journey created', journey);
      setJourneys(prev => [...prev, journey]);
      success('New journey added by another user');
    });
    
    socketService.on('journey:updated', (journey: Journey) => {
      console.log('Real-time: Journey updated', journey);
      setJourneys(prev => prev.map(j => j.id === journey.id ? journey : j));
      if (selectedJourney?.id === journey.id) {
        setSelectedJourney(journey);
      }
      // Notification only for real-time updates from other users
    });
    
    socketService.on('journey:deleted', ({ id }: { id: number }) => {
      console.log('Real-time: Journey deleted', id);
      setJourneys(prev => prev.filter(j => j.id !== id));
      if (selectedJourney?.id === id) {
        setSelectedJourney(null);
      }
      warning('Journey deleted by another user');
    });
    
    // Listen for stop events
    socketService.on('stop:created', (stop: Stop) => {
      console.log('Real-time: Stop created', stop);
      setJourneys(prev => prev.map(j => {
  if (j.id === stop.journeyId) {
          return { ...j, stops: [...(j.stops || []), stop] };
        }
        return j;
      }));
  if (selectedJourney?.id === stop.journeyId) {
        setSelectedJourney(prev => prev ? { ...prev, stops: [...(prev.stops || []), stop] } : null);
      }
      // Notification only for real-time updates from other users
    });
    
    socketService.on('stop:updated', (stop: Stop) => {
      console.log('Real-time: Stop updated', stop);
      setJourneys(prev => prev.map(j => {
  if (j.id === stop.journeyId) {
          return { 
            ...j, 
            stops: (j.stops || []).map(s => s.id === stop.id ? stop : s) 
          };
        }
        return j;
      }));
  if (selectedJourney?.id === stop.journeyId) {
        setSelectedJourney(prev => prev ? {
          ...prev,
          stops: (prev.stops || []).map(s => s.id === stop.id ? stop : s)
        } : null);
      }
      // Removed duplicate notification - handled by manual actions
    });
    
    socketService.on('stop:deleted', ({ id }: { id: number }) => {
      console.log('Real-time: Stop deleted', id);
      setJourneys(prev => prev.map(j => ({
        ...j,
        stops: (j.stops || []).filter(s => s.id !== id)
      })));
      if (selectedJourney) {
        setSelectedJourney(prev => prev ? {
          ...prev,
          stops: (prev.stops || []).filter(s => s.id !== id)
        } : null);
      }
      warning('Stop deleted');
    });
    
    // Listen for attraction events
    socketService.on('attraction:created', (attraction: Attraction) => {
      console.log('Real-time: Attraction created', attraction);
      setJourneys(prev => prev.map(j => ({
        ...j,
        stops: (j.stops || []).map(s => {
          if (s.id === attraction.stopId) {
            return { ...s, attractions: [...(s.attractions || []), attraction] };
          }
          return s;
        })
      })));
      if (selectedJourney) {
        setSelectedJourney(prev => prev ? {
          ...prev,
          stops: (prev.stops || []).map(s => {
            if (s.id === attraction.stopId) {
              return { ...s, attractions: [...(s.attractions || []), attraction] };
            }
            return s;
          })
        } : null);
      }
      // Notification only for real-time updates from other users
    });
    
    socketService.on('attraction:updated', (attraction: Attraction) => {
      console.log('Real-time: Attraction updated', attraction);
      setJourneys(prev => prev.map(j => ({
        ...j,
        stops: (j.stops || []).map(s => ({
          ...s,
          attractions: (s.attractions || []).map(a => a.id === attraction.id ? attraction : a)
        }))
      })));
      if (selectedJourney) {
        setSelectedJourney(prev => prev ? {
          ...prev,
          stops: (prev.stops || []).map(s => ({
            ...s,
            attractions: (s.attractions || []).map(a => a.id === attraction.id ? attraction : a)
          }))
        } : null);
      }
      // Removed duplicate notification - handled by manual actions
    });
    
    socketService.on('attraction:deleted', ({ id }: { id: number }) => {
      console.log('Real-time: Attraction deleted', id);
      setJourneys(prev => prev.map(j => ({
        ...j,
        stops: (j.stops || []).map(s => ({
          ...s,
          attractions: (s.attractions || []).filter(a => a.id !== id)
        }))
      })));
      if (selectedJourney) {
        setSelectedJourney(prev => prev ? {
          ...prev,
          stops: (prev.stops || []).map(s => ({
            ...s,
            attractions: (s.attractions || []).filter(a => a.id !== id)
          }))
        } : null);
      }
      warning('Attraction deleted');
    });
    
    // Listen for transport events
    socketService.on('transport:created', (transport: any) => {
      console.log('Real-time: Transport created', transport);
        setJourneys(prev => prev.map(j => {
          if (j.id === transport.journeyId) {
          return { ...j, transports: [...(j.transports || []), transport] };
        }
        return j;
      }));
      if (selectedJourney?.id === transport.journeyId) {
        setSelectedJourney(prev => prev ? { 
          ...prev, 
          transports: [...(prev.transports || []), transport] 
        } : null);
      }
      // Notification only for real-time updates from other users
    });
    
    socketService.on('transport:updated', (transport: any) => {
      console.log('Real-time: Transport updated', transport);
        setJourneys(prev => prev.map(j => {
          if (j.id === transport.journeyId) {
          return { 
            ...j, 
            transports: (j.transports || []).map(t => t.id === transport.id ? transport : t)
          };
        }
        return j;
      }));
  if (selectedJourney?.id === transport.journeyId) {
        setSelectedJourney(prev => prev ? {
          ...prev,
          transports: (prev.transports || []).map(t => t.id === transport.id ? transport : t)
        } : null);
      }
      // Removed duplicate notification - handled by manual actions
    });
    
    socketService.on('transport:deleted', ({ id, journeyId }: { id: number; journeyId: number }) => {
      console.log('Real-time: Transport deleted', id);
        setJourneys(prev => prev.map(j => {
          if (j.id === journeyId) {
          return {
            ...j,
            transports: (j.transports || []).filter(t => t.id !== id)
          };
        }
        return j;
      }));
      if (selectedJourney?.id === journeyId) {
        setSelectedJourney(prev => prev ? {
          ...prev,
          transports: (prev.transports || []).filter(t => t.id !== id)
        } : null);
      }
      warning('Transport deleted');
    });
    
    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Auto-calculate total cost from all sources
  const costDependency = useMemo(() => {
    if (!selectedJourney) return '';
    return JSON.stringify({
      stops: selectedJourney.stops?.map(s => ({ 
        id: s.id, 
        price: s.accommodationPrice,
        attractions: s.attractions?.map(a => ({ id: a.id, cost: a.estimatedCost }))
      })),
      transports: selectedJourney.transports?.map(t => ({ id: t.id, price: t.price }))
    });
  }, [selectedJourney]);

  useEffect(() => {
    if (!selectedJourney) return;
    
    // Calculate costs from stops (accommodation)
    const stopCosts = selectedJourney.stops?.reduce((sum, stop) => {
      return sum + (stop.accommodationPrice || 0);
    }, 0) || 0;
    
    // Calculate costs from attractions
    const attractionCosts = selectedJourney.stops?.reduce((sum, stop) => {
      const attrSum = stop.attractions?.reduce((s, a) => s + (a.estimatedCost || 0), 0) || 0;
      return sum + attrSum;
    }, 0) || 0;
    
    // Calculate costs from transports
    const transportCosts = selectedJourney.transports?.reduce((sum, t) => sum + (t.price || 0), 0) || 0;
    
    const totalCost = stopCosts + attractionCosts + transportCosts;
    
    // Only update if changed to avoid infinite loop
    if (selectedJourney.totalEstimatedCost !== totalCost) {
      const updatedJourney = { ...selectedJourney, totalEstimatedCost: totalCost };
      setSelectedJourney(updatedJourney);
      setJourneys(prevJourneys => prevJourneys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJourney?.id, costDependency]);

  const loadJourneys = async () => {
    try {
      setLoading(true);
      const data = await journeyService.getAllJourneys();
      setJourneys(data);
    } catch (err) {
      console.error('Failed to load journeys:', err);
      error('Failed to load journeys. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJourney = async () => {
    if (!newJourney.title || !newJourney.startDate || !newJourney.endDate) {
      warning('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const created = await journeyService.createJourney(newJourney);
      setJourneys([created, ...journeys]);
      setShowNewJourneyForm(false);
      setNewJourney({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        currency: 'PLN',
        stops: [],
        transports: [],
      });
      success('Journey created successfully!');
    } catch (err) {
      console.error('Failed to create journey:', err);
      error('Failed to create journey');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJourney = async (id: number) => {
    const confirmed = await confirm.confirm({
      title: 'Delete Journey',
      message: 'Are you sure you want to delete this journey? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await journeyService.deleteJourney(id);
      setJourneys(journeys.filter(j => j.id !== id));
      if (selectedJourney?.id === id) {
        setSelectedJourney(null);
      }
      success('Journey deleted successfully');
    } catch (err) {
      console.error('Failed to delete journey:', err);
      error('Failed to delete journey');
    } finally {
      setLoading(false);
    }
  };

  const handleEditJourney = async () => {
    if (!editingJourney?.id || !editingJourney.title) {
      warning('Please fill in the journey title');
      return;
    }

    try {
      setLoading(true);
      const updated = await journeyService.updateJourney(editingJourney.id, editingJourney);
      
      setJourneys(journeys.map(j => j.id === updated.id ? updated : j));
      if (selectedJourney?.id === updated.id) {
        setSelectedJourney(updated);
      }
      setShowEditJourneyForm(false);
      setEditingJourney(null);
      success('Journey updated successfully!');
    } catch (err) {
      console.error('Failed to update journey:', err);
      error('Failed to update journey');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setNewStop({ ...newStop, latitude: lat, longitude: lng });
    setShowStopForm(true);
  };

  const handleGeocodeCity = async (city: string, country: string) => {
    if (!city || !country) {
      warning('Please enter both city and country');
      return;
    }

    try {
      setLoading(true);
      const query = `${city}, ${country}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'JourneyPlannerApp/1.0',
          },
        }
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setNewStop({
          ...newStop,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
        });
        success('Location found on map!');
      } else {
        warning('Location not found. Try a different spelling or click on the map.');
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
      error('Failed to find location');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingUrlPaste = async () => {
    if (!bookingUrl || !bookingUrl.includes('booking.com')) {
      warning('Please enter a valid Booking.com URL');
      return;
    }

    try {
      setLoading(true);
      const result = await stopService.scrapeBookingUrl(bookingUrl);
      
      if (result.success && result.data) {
        setNewStop({
          ...newStop,
          accommodationName: result.data.accommodationName || newStop.accommodationName,
          accommodationUrl: result.data.accommodationUrl || newStop.accommodationUrl,
          city: result.data.city || newStop.city,
          arrivalDate: result.data.arrivalDate || newStop.arrivalDate,
          departureDate: result.data.departureDate || newStop.departureDate,
          accommodationPrice: result.data.accommodationPrice || newStop.accommodationPrice,
          accommodationCurrency: result.data.accommodationCurrency || newStop.accommodationCurrency,
        });
        
        if (result.data.arrivalDate && result.data.departureDate) {
          success('Booking details extracted! Please verify and add price.');
        } else {
          info('Hotel name extracted. Please fill in dates and price manually.');
        }
      } else {
        warning(result.message || 'Could not extract all details. Please fill manually.');
      }
      
      setBookingUrl('');
    } catch (err) {
      console.error('Failed to scrape Booking URL:', err);
      error('Failed to parse Booking.com URL. Please enter details manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStop = async () => {
    if (!selectedJourney || !newStop.city || !newStop.country) {
      warning('Please fill in city and country');
      return;
    }

    try {
      setLoading(true);
      
      // Use the new createStop endpoint
      const createdStop = await stopService.createStop(selectedJourney.id!, newStop);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        stops: [...(selectedJourney.stops || []), createdStop],
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      setNewStop({
        city: '',
        country: '',
        latitude: 51.505,
        longitude: -0.09,
        arrivalDate: '',
        departureDate: '',
        accommodationName: '',
        accommodationUrl: '',
        accommodationPrice: 0,
        accommodationCurrency: 'PLN',
      });
      setShowStopForm(false);
      setBookingUrl('');
      success('Stop added successfully!');
    } catch (err) {
      console.error('Failed to add stop:', err);
      error('Failed to add stop');
    } finally {
      setLoading(false);
    }
  };

  // Auto-geocode attraction address
  const handleGeocodeAttraction = async () => {
    const { addressStreet, addressCity, addressPostalCode, addressCountry } = newAttraction;
    
    if (!addressStreet && !addressCity && !addressPostalCode && !addressCountry) {
      warning('Please enter at least some address information');
      return;
    }

    try {
      setGeocodingAttraction(true);
      const result = await geocodeAddress(
        addressStreet,
        addressCity,
        addressPostalCode,
        addressCountry
      );

      if (result) {
        setNewAttraction({
          ...newAttraction,
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.displayName, // Save full formatted address
        });
        success(`Coordinates found: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
      } else {
        error('Address not found. Please try different address details.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      error('Failed to find coordinates');
    } finally {
      setGeocodingAttraction(false);
    }
  };

  const handleAddAttraction = async () => {
    if (!selectedStopForAttraction || !newAttraction.name) {
      warning('Please fill in attraction name');
      return;
    }

    try {
      setLoading(true);
      
      // Create attraction using the new endpoint
      // Defensive: convert empty string to null for estimatedCost/duration
      const payload = {
        ...newAttraction,
        estimatedCost:
          newAttraction.estimatedCost === undefined || newAttraction.estimatedCost === null
            ? null
            : newAttraction.estimatedCost,
        duration:
          newAttraction.duration === '' || newAttraction.duration === undefined
            ? null
            : newAttraction.duration,
      };
      const createdAttraction = await attractionService.createAttraction(
        selectedStopForAttraction!,
        payload
      );
      
      // Update local state - find the stop and add the attraction
      if (selectedJourney) {
        const updatedStops = selectedJourney.stops?.map(stop => {
          if (stop.id === selectedStopForAttraction) {
            return {
              ...stop,
              attractions: [...(stop.attractions || []), createdAttraction],
            };
          }
          return stop;
        });
        
        const updatedJourney = {
          ...selectedJourney,
          stops: updatedStops,
        };
        
        setSelectedJourney(updatedJourney);
        setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      }
      
      setNewAttraction({
        name: '',
        description: '',
        estimatedCost: 0,
        duration: '',
      });
      setShowAttractionForm(false);
      setSelectedStopForAttraction(null);
      success('Attraction added successfully!');
    } catch (err) {
      console.error('Failed to add attraction:', err);
      error('Failed to add attraction');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStop = async (stopId: number) => {
    if (!selectedJourney) return;

    const confirmed = await confirm.confirm({
      title: 'Delete Stop',
      message: 'Are you sure you want to delete this stop? All attractions at this stop will also be deleted.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await stopService.deleteStop(stopId);
      
      const updatedStops = selectedJourney.stops?.filter(s => s.id !== stopId);
      const updatedJourney = { ...selectedJourney, stops: updatedStops };
      
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      success('Stop deleted successfully!');
    } catch (err) {
      console.error('Failed to delete stop:', err);
      error('Failed to delete stop');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttraction = async (stopId: number, attractionId: number) => {
    if (!selectedJourney) return;

    const confirmed = await confirm.confirm({
      title: 'Delete Attraction',
      message: 'Are you sure you want to delete this attraction?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await attractionService.deleteAttraction(attractionId);
      
      const updatedStops = selectedJourney.stops?.map(stop => {
        if (stop.id === stopId) {
          return {
            ...stop,
            attractions: stop.attractions?.filter(a => a.id !== attractionId),
          };
        }
        return stop;
      });
      
      const updatedJourney = { ...selectedJourney, stops: updatedStops };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      success('Attraction deleted successfully!');
    } catch (err) {
      console.error('Failed to delete attraction:', err);
      error('Failed to delete attraction');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransport = async (transportId: number) => {
    if (!selectedJourney) return;

    const confirmed = await confirm.confirm({
      title: 'Delete Transport',
      message: 'Are you sure you want to delete this transport?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await transportService.deleteTransport(transportId);
      
      const updatedTransports = selectedJourney.transports?.filter(t => t.id !== transportId);
      const updatedJourney = { ...selectedJourney, transports: updatedTransports };
      
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      success('Transport deleted successfully!');
    } catch (err) {
      console.error('Failed to delete transport:', err);
      error('Failed to delete transport');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStop = async () => {
    if (!editingStop?.id || !selectedJourney) return;

    try {
      setLoading(true);
      const updated = await stopService.updateStop(editingStop.id, editingStop);
      
      const updatedStops = selectedJourney.stops?.map(s => s.id === updated.id ? updated : s);
      const updatedJourney = { ...selectedJourney, stops: updatedStops };
      
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      setShowEditStopForm(false);
      setEditingStop(null);
      success('Stop updated successfully!');
    } catch (err) {
      console.error('Failed to update stop:', err);
      error('Failed to update stop');
    } finally {
      setLoading(false);
    }
  };

  // Auto-geocode edited attraction address
  const handleGeocodeEditAttraction = async () => {
    if (!editingAttraction) return;
    
    const { addressStreet, addressCity, addressPostalCode, addressCountry } = editingAttraction;
    
    if (!addressStreet && !addressCity && !addressPostalCode && !addressCountry) {
      warning('Please enter at least some address information');
      return;
    }

    try {
      setGeocodingEditAttraction(true);
      const result = await geocodeAddress(
        addressStreet,
        addressCity,
        addressPostalCode,
        addressCountry
      );

      if (result) {
        setEditingAttraction({
          ...editingAttraction,
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.displayName,
        });
        success(`Coordinates found: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
      } else {
        error('Address not found. Please try different address details.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      error('Failed to find coordinates');
    } finally {
      setGeocodingEditAttraction(false);
    }
  };

  const handleEditAttraction = async () => {
    if (!editingAttraction?.id || !editingAttractionStopId || !selectedJourney) return;

    try {
      setLoading(true);
      const updated = await attractionService.updateAttraction(editingAttraction.id, editingAttraction);
      
      const updatedStops = selectedJourney.stops?.map(stop => {
        if (stop.id === editingAttractionStopId) {
          return {
            ...stop,
            attractions: stop.attractions?.map(a => a.id === updated.id ? updated : a),
          };
        }
        return stop;
      });
      
      const updatedJourney = { ...selectedJourney, stops: updatedStops };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      setShowEditAttractionForm(false);
      setEditingAttraction(null);
      setEditingAttractionStopId(null);
      success('Attraction updated successfully!');
    } catch (err) {
      console.error('Failed to update attraction:', err);
      error('Failed to update attraction');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransport = async () => {
    if (!editingTransport?.id || !selectedJourney) return;

    try {
      setLoading(true);
      const updated = await transportService.updateTransport(editingTransport.id, editingTransport);
      
      const updatedTransports = selectedJourney.transports?.map(t => t.id === updated.id ? updated : t);
      const updatedJourney = { ...selectedJourney, transports: updatedTransports };
      
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      setShowEditTransportForm(false);
      setEditingTransport(null);
      success('Transport updated successfully!');
    } catch (err) {
      console.error('Failed to update transport:', err);
      error('Failed to update transport');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransport = async () => {
    if (!selectedJourney || !newTransport.fromLocation || !newTransport.toLocation) {
      warning('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      // Use transportService instead of updating journey directly
      const createdTransport = await transportService.createTransport(selectedJourney.id!, newTransport);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        transports: [...(selectedJourney.transports || []), createdTransport],
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      setNewTransport({
        type: 'flight',
        fromLocation: '',
        toLocation: '',
        departureDate: '',
        arrivalDate: '',
        price: 0,
        currency: 'PLN',
        bookingUrl: '',
        flightNumber: '',
        trainNumber: '',
      });
      setShowTransportForm(false);
      success('Transport added successfully!');
    } catch (err) {
      console.error('Failed to add transport:', err);
      error('Failed to add transport');
    } finally {
      setLoading(false);
    }
  };

  // Payment status handlers
  const handleToggleStopPayment = async (stopId: number, currentStatus: boolean) => {
    if (!selectedJourney) return;
    
    try {
      await stopService.updatePaymentStatus(stopId, !currentStatus);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        stops: selectedJourney.stops?.map(s => 
          s.id === stopId ? { ...s, isPaid: !currentStatus } : s
        ),
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      success(`Payment status updated`);
    } catch (err) {
      console.error('Failed to update payment status:', err);
      error('Failed to update payment status');
    }
  };

  const handleToggleTransportPayment = async (transportId: number, currentStatus: boolean) => {
    if (!selectedJourney) return;
    
    try {
      await transportService.updatePaymentStatus(transportId, !currentStatus);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        transports: selectedJourney.transports?.map(t => 
          t.id === transportId ? { ...t, isPaid: !currentStatus } : t
        ),
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      success(`Payment status updated`);
    } catch (err) {
      console.error('Failed to update payment status:', err);
      error('Failed to update payment status');
    }
  };

  const handleToggleAttractionPayment = async (stopId: number, attractionId: number, currentStatus: boolean) => {
    if (!selectedJourney) return;
    
    try {
  // Defensive: only send isPaid, not other fields
  await attractionService.updatePaymentStatus(attractionId, !currentStatus);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        stops: selectedJourney.stops?.map(s => 
          s.id === stopId ? {
            ...s,
            attractions: s.attractions?.map(a =>
              a.id === attractionId ? { ...a, isPaid: !currentStatus } : a
            )
          } : s
        ),
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      success(`Payment status updated`);
    } catch (err) {
      console.error('Failed to update payment status:', err);
      error('Failed to update payment status');
    }
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-4 h-4" />;
      case 'train':
        return <Train className="w-4 h-4" />;
      case 'bus':
        return <Bus className="w-4 h-4" />;
      case 'car':
        return <Car className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  // Calculate total estimated cost dynamically from stops, transports, and attractions
  const calculateJourneyTotalCost = (journey: Journey): number => {
    const stopsCost = journey.stops?.reduce((sum, stop) => sum + (stop.accommodationPrice || 0), 0) || 0;
    const attractionsCost = journey.stops?.reduce((sum, stop) => {
      const attrSum = stop.attractions?.reduce((s, a) => s + (a.estimatedCost || 0), 0) || 0;
      return sum + attrSum;
    }, 0) || 0;
    const transportsCost = journey.transports?.reduce((sum, t) => sum + (t.price || 0), 0) || 0;
    
    return stopsCost + attractionsCost + transportsCost;
  };

  // Share journey handler
  const handleShareJourney = async () => {
    if (!selectedJourney || !shareEmailOrUsername.trim()) {
      warning('Please enter email or username');
      return;
    }

    try {
      setLoading(true);
      await journeyShareService.shareJourney(selectedJourney.id!, shareEmailOrUsername);
      success(`Journey shared with ${shareEmailOrUsername}!`);
      setShowShareModal(false);
      setShareEmailOrUsername('');
    } catch (err: any) {
      console.error('Failed to share journey:', err);
      error(err.message || 'Failed to share journey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e] font-github transition-colors duration-200">
      {/* Header with Burger Menu */}
      <header className="bg-white dark:bg-[#2c2c2e] border-b border-gray-200 dark:border-[#38383a] sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#38383a] rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-900 dark:text-[#ffffff]" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-900 dark:text-[#ffffff]" />
                )}
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-[#ffffff]">
                🗺️ Journey Planner
              </h1>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#38383a] rounded-lg border border-gray-200 dark:border-[#38383a]">
                  <User className="w-4 h-4 text-gray-600 dark:text-[#98989d]" />
                  <span className="text-sm text-gray-900 dark:text-[#ffffff] font-medium">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="text-xs px-2 py-0.5 bg-blue-500 dark:bg-[#0a84ff] text-white rounded-full font-medium">
                      Admin
                    </span>
                  )}
                </div>
              )}
              
              {/* Settings Button */}
              <Link
                to="/settings"
                className="px-4 py-2 bg-gray-200 dark:bg-[#38383a] hover:bg-gray-300 dark:hover:bg-[#1c1c1e] border border-gray-300 dark:border-[#38383a] text-gray-700 dark:text-[#ffffff] rounded-lg transition-colors flex items-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              
              {/* New Journey Button */}
              <button
                onClick={() => setShowNewJourneyForm(true)}
                className="gh-btn-primary"
                disabled={loading}
              >
                <Plus className="w-5 h-5" />
                New Journey
              </button>
              
              {/* Logout Button */}
              <button
                onClick={async () => {
                  const confirmed = await confirm.confirm({
                    title: 'Logout',
                    message: 'Are you sure you want to logout?',
                    confirmText: 'Logout',
                    cancelText: 'Cancel',
                    confirmVariant: 'danger',
                  });
                  if (confirmed) {
                    logout();
                  }
                }}
                className="gh-btn-danger"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>

            {/* Mobile New Journey Button */}
            <button
              onClick={() => setShowNewJourneyForm(true)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-lg transition-colors"
              disabled={loading}
            >
              <Plus className="w-6 h-6 text-blue-600 dark:text-[#0a84ff]" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-[#38383a] bg-white dark:bg-[#2c2c2e]">
            <div className="px-4 py-3 space-y-2">
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a] mb-3">
                  <User className="w-4 h-4 text-gray-600 dark:text-[#98989d]" />
                  <span className="text-sm text-gray-900 dark:text-[#ffffff] font-medium">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full font-medium">
                      Admin
                    </span>
                  )}
                </div>
              )}
              
              {/* Settings Link */}
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full gh-btn-secondary justify-center"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              
              {/* New Journey Button */}
              <button
                onClick={() => {
                  setShowNewJourneyForm(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full gh-btn-primary justify-center"
                disabled={loading}
              >
                <Plus className="w-5 h-5" />
                New Journey
              </button>
              
              {/* Logout Button */}
              <button
                onClick={async () => {
                  const confirmed = await confirm.confirm({
                    title: 'Logout',
                    message: 'Are you sure you want to logout?',
                    confirmText: 'Logout',
                    cancelText: 'Cancel',
                    confirmVariant: 'danger',
                  });
                  if (confirmed) {
                    logout();
                    setIsMobileMenuOpen(false);
                  }
                }}
                className="w-full gh-btn-danger justify-center"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Journey List - Sidebar */}
          <div className="lg:col-span-1">
            <div className="gh-card">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-[#ffffff]">Your Journeys</h2>
              <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                {loading && journeys.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-[#98989d] text-center py-8">
                    Loading journeys...
                  </p>
                ) : journeys.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-[#98989d] text-center py-8">
                    No journeys yet. Create your first journey!
                  </p>
                ) : (
                  journeys.map((journey) => (
                    <div
                      key={journey.id}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedJourney?.id === journey.id
                          ? 'bg-gray-100 dark:bg-[#3f3f44] border-gray-300 dark:border-[#48484a]'
                          : 'bg-gray-50 dark:bg-[#1c1c1e] border-gray-200 dark:border-[#38383a] hover:border-gray-300 dark:hover:border-[#48484a]'
                      }`}
                    >
                      <div
                        onClick={() => setSelectedJourney(journey)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-[#ffffff]">{journey.title}</h3>
                          {journey.isShared && (
                            <div title="Shared journey">
                              <Users className="w-4 h-4 text-blue-600 dark:text-[#0a84ff]" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-[#98989d]">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDateForDisplay(journey.startDate)} -{' '}
                            {formatDateForDisplay(journey.endDate)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Estimated Cost - Always visible and dynamically calculated */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#38383a]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-[#30d158]">
                            <DollarSign className="w-4 h-4" />
                            <span>Estimated Cost:</span>
                          </div>
                          <span className="text-sm font-semibold text-green-600 dark:text-[#30d158]">
                            {calculateJourneyTotalCost(journey).toFixed(2)} {journey.currency}
                          </span>
                        </div>
                        
                        {/* Amount Due - Cost remaining after paid items */}
                        {(() => {
                          const amountDue = calculateAmountDue(
                            journey.stops || [],
                            journey.transports || []
                          );
                          const paymentSummary = getPaymentSummary(
                            journey.stops || [],
                            journey.transports || []
                          );
                          
                          return amountDue > 0 ? (
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-[#ff453a]">
                                <XCircle className="w-4 h-4" />
                                <span>Amount Due:</span>
                              </div>
                              <span className="text-sm font-semibold text-red-600 dark:text-[#ff453a]">
                                {amountDue.toFixed(2)} {journey.currency}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-[#30d158]">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Fully Paid</span>
                              </div>
                              <span className="text-sm font-semibold text-green-600 dark:text-[#30d158]">
                                {paymentSummary.percentPaid}%
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {selectedJourney?.id === journey.id && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-gray-200 dark:border-[#38383a]">
                          {/* Share Journey Button - Only for journey owner */}
                          {!journey.isShared && (
                            <button
                              onClick={() => setShowShareModal(true)}
                              className="w-full px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                              disabled={loading}
                            >
                              <Share2 className="w-4 h-4" />
                              Share Journey
                            </button>
                          )}
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingJourney(journey);
                                setShowEditJourneyForm(true);
                              }}
                              className="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                              disabled={loading}
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Journey
                            </button>
                            <button
                              onClick={() => handleDeleteJourney(journey.id!)}
                              className="flex-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Journey
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Map and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            <div className="gh-card p-0 overflow-hidden" style={{ height: '500px' }}>
              <JourneyMap
                locations={
                  selectedJourney?.stops?.map((stop) => ({
                    lat: stop.latitude,
                    lng: stop.longitude,
                    city: stop.city,
                    country: stop.country,
                    arrivalDate: stop.arrivalDate,
                    departureDate: stop.departureDate,
                    accommodationName: stop.accommodationName,
                    checkInTime: stop.checkInTime,
                    checkOutTime: stop.checkOutTime,
                    attractions: stop.attractions,
                  })) || []
                }
                onMapClick={selectedJourney ? handleMapClick : undefined}
                center={
                  // Use newStop coordinates if available (for geocoding), otherwise use first stop
                  newStop.latitude && newStop.longitude
                    ? [newStop.latitude, newStop.longitude]
                    : selectedJourney?.stops && selectedJourney.stops.length > 0
                    ? [
                        selectedJourney.stops[0].latitude,
                        selectedJourney.stops[0].longitude,
                      ]
                    : undefined
                }
              />
            </div>

            {/* Journey Details */}
            {selectedJourney ? (
              <div className="gh-card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff]">{selectedJourney.title}</h2>
                    {selectedJourney.description && (
                      <p className="text-gray-600 dark:text-[#98989d] mt-2">{selectedJourney.description}</p>
                    )}
                  </div>
                </div>

                {/* Stops */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff]">Stops</h3>
                    <button
                      onClick={() => setShowStopForm(true)}
                      className="gh-btn-secondary text-sm"
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4" />
                      Add Stop
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedJourney.stops && selectedJourney.stops.length > 0 ? (
                      selectedJourney.stops.map((stop, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-[#1c1c1e] p-4 rounded-lg border border-gray-200 dark:border-[#38383a]">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-blue-600 dark:text-[#0a84ff] mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-[#ffffff]">
                                  {stop.city}, {stop.country}
                                </h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingStop(stop);
                                      setShowEditStopForm(true);
                                    }}
                                    className="text-blue-600 dark:text-[#0a84ff] hover:bg-blue-600 dark:hover:bg-[#0a84ff] hover:text-white rounded p-1 cursor-pointer transition-all duration-300 ease-in-out"
                                    disabled={loading}
                                    title="Edit stop"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStop(stop.id!)}
                                    className="text-red-600 dark:text-[#ff453a] hover:bg-red-600 dark:hover:bg-[#ff453a] hover:text-white rounded p-1 cursor-pointer transition-all duration-300 ease-in-out"
                                    disabled={loading}
                                    title="Delete stop"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-[#98989d] mt-1">
                                {formatDateForDisplay(stop.arrivalDate)} -{' '}
                                {formatDateForDisplay(stop.departureDate)}
                              </p>
                              {stop.accommodationName && (
                                <div className="mt-2 text-sm">
                                  <p className="font-medium text-gray-900 dark:text-[#ffffff]">Accommodation:</p>
                                  <p className="text-gray-600 dark:text-[#98989d]">{stop.accommodationName}</p>
                                  {stop.accommodationPrice && (
                                    <div className="flex items-center justify-between">
                                      <p className="text-green-600 dark:text-[#30d158]">
                                        {stop.accommodationPrice} {stop.accommodationCurrency}
                                      </p>
                                      <PaymentCheckbox
                                        id={`stop-payment-${stop.id}`}
                                        checked={stop.isPaid || false}
                                        onChange={() => handleToggleStopPayment(stop.id!, stop.isPaid || false)}
                                        disabled={loading}
                                      />
                                    </div>
                                  )}
                                  {stop.accommodationUrl && (
                                    <a
                                      href={stop.accommodationUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-[#0a84ff] hover:underline"
                                    >
                                      View booking →
                                    </a>
                                  )}
                                </div>
                              )}
                              {stop.attractions && stop.attractions.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-[#ffffff]">Attractions:</p>
                                  <ul className="text-sm space-y-1 mt-1">
                                    {stop.attractions.map((attr, i) => (
                                      <li key={i} className="text-gray-600 dark:text-[#98989d] flex justify-between items-start group gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-2">
                                            <span className="flex-1">
                                              • {attr.name}
                                              {attr.estimatedCost && ` - ${attr.estimatedCost} ${selectedJourney.currency}`}
                                            </span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                              <button
                                                onClick={() => {
                                                  setEditingAttraction(attr);
                                                  setEditingAttractionStopId(stop.id!);
                                                  setShowEditAttractionForm(true);
                                                }}
                                                className="text-blue-600 dark:text-[#0a84ff] hover:bg-blue-600 dark:hover:bg-[#0a84ff] hover:text-white rounded p-1 cursor-pointer transition-all duration-300 ease-in-out"
                                                disabled={loading}
                                                title="Edit attraction"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteAttraction(stop.id!, attr.id!)}
                                                className="text-red-600 dark:text-[#ff453a] hover:bg-red-600 dark:hover:bg-[#ff453a] hover:text-white rounded p-1 cursor-pointer transition-all duration-300 ease-in-out"
                                                disabled={loading}
                                                title="Delete attraction"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                          {attr.estimatedCost && (
                                            <div className="mt-1 ml-4">
                                              <PaymentCheckbox
                                                id={`attraction-payment-${attr.id}`}
                                                checked={attr.isPaid || false}
                                                onChange={() => handleToggleAttractionPayment(stop.id!, attr.id!, attr.isPaid || false)}
                                                disabled={loading}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedStopForAttraction(stop.id!);
                                  setShowAttractionForm(true);
                                }}
                                className="mt-3 text-sm text-blue-600 dark:text-[#0a84ff] hover:underline flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" />
                                Add Attraction
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-[#98989d] text-center py-4">
                        No stops yet. Click on the map to add your first stop!
                      </p>
                    )}
                  </div>
                </div>

                {/* Transportation */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff]">Transportation</h3>
                    <button
                      onClick={() => setShowTransportForm(true)}
                      className="gh-btn-secondary text-sm"
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4" />
                      Add Transport
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedJourney.transports && selectedJourney.transports.length > 0 ? (
                      selectedJourney.transports.map((transport, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-[#1c1c1e] p-4 rounded-lg border border-gray-200 dark:border-[#38383a]">
                          <div className="flex items-start gap-3">
                            <div className="text-blue-600 dark:text-[#0a84ff] mt-1 flex-shrink-0">
                              {getTransportIcon(transport.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <h4 className="font-semibold capitalize text-gray-900 dark:text-[#ffffff]">{transport.type}</h4>
                                  {transport.flightNumber && (
                                    <p className="text-xs text-gray-500 dark:text-[#636366] mt-0.5">
                                      Flight: {transport.flightNumber}
                                    </p>
                                  )}
                                  {transport.trainNumber && (
                                    <p className="text-xs text-gray-500 dark:text-[#636366] mt-0.5">
                                      Train: {transport.trainNumber}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingTransport(transport);
                                      setShowEditTransportForm(true);
                                    }}
                                    className="text-blue-600 dark:text-[#0a84ff] hover:bg-blue-600 dark:hover:bg-[#0a84ff] hover:text-white rounded p-1 cursor-pointer transition-all duration-300 ease-in-out"
                                    disabled={loading}
                                    title="Edit transport"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransport(transport.id!)}
                                    className="text-red-600 dark:text-[#ff453a] hover:bg-red-600 dark:hover:bg-[#ff453a] hover:text-white rounded p-1 cursor-pointer transition-all duration-300 ease-in-out"
                                    disabled={loading}
                                    title="Delete transport"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-[#98989d]">
                                {transport.fromLocation} → {transport.toLocation}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-[#98989d] mt-1">
                                {new Date(transport.departureDate).toLocaleString()} -{' '}
                                {new Date(transport.arrivalDate).toLocaleString()}
                              </p>
                              <div className="text-sm mt-1 flex items-center justify-between">
                                <p className="font-medium text-green-600 dark:text-[#30d158]">
                                  {transport.price} {transport.currency}
                                </p>
                                <PaymentCheckbox
                                  id={`transport-payment-${transport.id}`}
                                  checked={transport.isPaid || false}
                                  onChange={() => handleToggleTransportPayment(transport.id!, transport.isPaid || false)}
                                  disabled={loading}
                                />
                              </div>
                              {transport.bookingUrl && (
                                <a
                                  href={transport.bookingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 dark:text-[#0a84ff] hover:underline"
                                >
                                  View booking →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-[#98989d] text-center py-4">
                        No transportation added yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="gh-card text-center py-12">
                <MapPin className="w-16 h-16 text-gray-600 dark:text-[#98989d] mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff] mb-2">
                  No Journey Selected
                </h3>
                <p className="text-gray-600 dark:text-[#98989d]">
                  Select a journey from the list or create a new one to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Journey Modal */}
      {showNewJourneyForm && (
        <div className="gh-modal-overlay" onClick={() => setShowNewJourneyForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Create New Journey</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Journey Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Europe Trip 2024"
                    value={newJourney.title}
                    onChange={(e) => setNewJourney({ ...newJourney, title: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your journey..."
                    value={newJourney.description}
                    onChange={(e) => setNewJourney({ ...newJourney, description: e.target.value })}
                    className="gh-textarea"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={newJourney.startDate as string}
                      onChange={(e) => setNewJourney({ ...newJourney, startDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={newJourney.endDate as string}
                      onChange={(e) => setNewJourney({ ...newJourney, endDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Currency
                  </label>
                  <select
                    value={newJourney.currency}
                    onChange={(e) => setNewJourney({ ...newJourney, currency: e.target.value })}
                    className="gh-select"
                  >
                    <option value="PLN">PLN (Polish Złoty)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewJourneyForm(false)}
                  className="gh-btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateJourney}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Journey'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Journey Modal */}
      {showEditJourneyForm && editingJourney && (
        <div className="gh-modal-overlay" onClick={() => setShowEditJourneyForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Edit Journey</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Journey Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Europe Trip 2024"
                    value={editingJourney.title}
                    onChange={(e) => setEditingJourney({ ...editingJourney, title: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your journey..."
                    value={editingJourney.description || ''}
                    onChange={(e) => setEditingJourney({ ...editingJourney, description: e.target.value })}
                    className="gh-textarea"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editingJourney.startDate)}
                      onChange={(e) => setEditingJourney({ ...editingJourney, startDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editingJourney.endDate)}
                      onChange={(e) => setEditingJourney({ ...editingJourney, endDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Currency
                  </label>
                  <select
                    value={editingJourney.currency}
                    onChange={(e) => setEditingJourney({ ...editingJourney, currency: e.target.value })}
                    className="gh-select"
                  >
                    <option value="PLN">PLN (Polish Złoty)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditJourneyForm(false);
                    setEditingJourney(null);
                  }}
                  className="gh-btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditJourney}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Journey'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Journey Modal */}
      {showShareModal && selectedJourney && (
        <div className="gh-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-4">
                Share Journey
              </h2>
              <p className="text-sm text-gray-600 dark:text-[#98989d] mb-6">
                Share "{selectedJourney.title}" with another user. They will receive an email invitation.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Email or Username *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter email or username"
                    value={shareEmailOrUsername}
                    onChange={(e) => setShareEmailOrUsername(e.target.value)}
                    className="gh-input"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-[#98989d] mt-2">
                    Enter the email address or username of the person you want to share with.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEmailOrUsername('');
                  }}
                  className="gh-btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareJourney}
                  className="gh-btn-primary flex-1"
                  disabled={loading || !shareEmailOrUsername.trim()}
                >
                  {loading ? 'Sharing...' : 'Share Journey'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stop Modal */}
      {showStopForm && (
        <div className="gh-modal-overlay" onClick={() => setShowStopForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Add Stop</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Paris"
                      value={newStop.city}
                      onChange={(e) => setNewStop({ ...newStop, city: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., France"
                      value={newStop.country}
                      onChange={(e) => setNewStop({ ...newStop, country: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                
                {/* Geocode Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleGeocodeCity(newStop.city || '', newStop.country || '')}
                    disabled={loading || !newStop.city || !newStop.country}
                    className="gh-btn-secondary text-sm flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Locate on Map
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Arrival Date
                    </label>
                    <input
                      type="date"
                      value={newStop.arrivalDate as string}
                      onChange={(e) => setNewStop({ ...newStop, arrivalDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Departure Date
                    </label>
                    <input
                      type="date"
                      value={newStop.departureDate as string}
                      onChange={(e) => setNewStop({ ...newStop, departureDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                
                {/* Booking.com URL Auto-fill */}
                <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    📎 Quick Fill from Booking.com
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste Booking.com URL here..."
                      value={bookingUrl}
                      onChange={(e) => setBookingUrl(e.target.value)}
                      className="gh-input flex-1"
                    />
                    <button
                      onClick={handleBookingUrlPaste}
                      disabled={loading || !bookingUrl}
                      className="gh-btn-primary whitespace-nowrap"
                    >
                      Auto-fill
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#636366] mt-2">
                    💡 Paste a Booking.com link to automatically extract hotel name, location, and dates
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Accommodation Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Hotel Name"
                    value={newStop.accommodationName}
                    onChange={(e) => setNewStop({ ...newStop, accommodationName: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Accommodation URL (Booking.com, Airbnb, etc.)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newStop.accommodationUrl}
                    onChange={(e) => setNewStop({ ...newStop, accommodationUrl: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Accommodation Price
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newStop.accommodationPrice || ''}
                      onChange={(e) => setNewStop({ ...newStop, accommodationPrice: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={newStop.accommodationCurrency}
                      onChange={(e) => setNewStop({ ...newStop, accommodationCurrency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#1c1c1e] p-3 rounded-lg border border-gray-200 dark:border-[#38383a]">
                  <p className="text-sm text-gray-600 dark:text-[#98989d]">
                    📍 Coordinates: {newStop.latitude?.toFixed(4)}, {newStop.longitude?.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-[#98989d] mt-1">
                    Click on the map to update coordinates
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowStopForm(false)}
                  className="gh-btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStop}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Stop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stop Modal */}
      {showEditStopForm && editingStop && (
        <div className="gh-modal-overlay" onClick={() => setShowEditStopForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Edit Stop</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Paris"
                      value={editingStop.city}
                      onChange={(e) => setEditingStop({ ...editingStop, city: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., France"
                      value={editingStop.country}
                      onChange={(e) => setEditingStop({ ...editingStop, country: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Arrival Date
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editingStop.arrivalDate)}
                      onChange={(e) => setEditingStop({ ...editingStop, arrivalDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Departure Date
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editingStop.departureDate)}
                      onChange={(e) => setEditingStop({ ...editingStop, departureDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Check-in Time
                    </label>
                    <input
                      type="time"
                      value={formatTimeForInput(editingStop.checkInTime)}
                      onChange={(e) => setEditingStop({ ...editingStop, checkInTime: e.target.value })}
                      className="gh-input"
                      placeholder="HH:MM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Check-out Time
                    </label>
                    <input
                      type="time"
                      value={formatTimeForInput(editingStop.checkOutTime)}
                      onChange={(e) => setEditingStop({ ...editingStop, checkOutTime: e.target.value })}
                      className="gh-input"
                      placeholder="HH:MM"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Accommodation Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Hotel Name"
                    value={editingStop.accommodationName || ''}
                    onChange={(e) => setEditingStop({ ...editingStop, accommodationName: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Accommodation URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editingStop.accommodationUrl || ''}
                    onChange={(e) => setEditingStop({ ...editingStop, accommodationUrl: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Accommodation Price
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingStop.accommodationPrice || ''}
                      onChange={(e) => setEditingStop({ ...editingStop, accommodationPrice: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={editingStop.accommodationCurrency || 'PLN'}
                      onChange={(e) => setEditingStop({ ...editingStop, accommodationCurrency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditStopForm(false);
                    setEditingStop(null);
                  }}
                  className="gh-btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditStop}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Stop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transport Modal */}
      {showTransportForm && (
        <div className="gh-modal-overlay" onClick={() => setShowTransportForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Add Transportation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Transport Type *
                  </label>
                  <select
                    value={newTransport.type}
                    onChange={(e) => setNewTransport({ ...newTransport, type: e.target.value as Transport['type'] })}
                    className="gh-select"
                  >
                    <option value="flight">✈️ Flight</option>
                    <option value="train">🚆 Train</option>
                    <option value="bus">🚌 Bus</option>
                    <option value="car">🚗 Car</option>
                    <option value="other">🚢 Other</option>
                  </select>
                </div>
                
                {/* Conditional field for Flight Number */}
                {newTransport.type === 'flight' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Flight Number
                      <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(e.g., LO123, FR1234)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., LO123"
                      value={newTransport.flightNumber || ''}
                      onChange={(e) => setNewTransport({ ...newTransport, flightNumber: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                )}
                
                {/* Conditional field for Train Number */}
                {newTransport.type === 'train' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Train Number
                      <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(e.g., TLK 12345, IC 5002)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., TLK 12345"
                      value={newTransport.trainNumber || ''}
                      onChange={(e) => setNewTransport({ ...newTransport, trainNumber: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      From *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Warsaw"
                      value={newTransport.fromLocation}
                      onChange={(e) => setNewTransport({ ...newTransport, fromLocation: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      To *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Paris"
                      value={newTransport.toLocation}
                      onChange={(e) => setNewTransport({ ...newTransport, toLocation: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Departure *
                    </label>
                    <input
                      type="datetime-local"
                      value={newTransport.departureDate as string}
                      onChange={(e) => setNewTransport({ ...newTransport, departureDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Arrival *
                    </label>
                    <input
                      type="datetime-local"
                      value={newTransport.arrivalDate as string}
                      onChange={(e) => setNewTransport({ ...newTransport, arrivalDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newTransport.price || ''}
                      onChange={(e) => setNewTransport({ ...newTransport, price: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={newTransport.currency}
                      onChange={(e) => setNewTransport({ ...newTransport, currency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Ticket URL/Attachment
                    <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(Flight, train, or bus ticket link)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://ryanair.com/... or Booking.com link"
                      value={newTransport.bookingUrl}
                      onChange={(e) => setNewTransport({ ...newTransport, bookingUrl: e.target.value })}
                      className="gh-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newTransport.bookingUrl) {
                          warning('Please enter a ticket URL first');
                          return;
                        }
                        try {
                          setLoading(true);
                          const data = await transportService.scrapeTicket(newTransport.bookingUrl);
                          setNewTransport({
                            ...newTransport,
                            fromLocation: data.fromLocation || newTransport.fromLocation,
                            toLocation: data.toLocation || newTransport.toLocation,
                            departureDate: data.departureDate || newTransport.departureDate,
                            arrivalDate: data.arrivalDate || newTransport.arrivalDate,
                            price: data.price || newTransport.price,
                            currency: data.currency || newTransport.currency,
                          });
                          success('Ticket data scraped successfully!');
                        } catch {
                          error('Failed to scrape ticket data');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="gh-btn-secondary px-4"
                      disabled={loading || !newTransport.bookingUrl}
                    >
                      {loading ? '🔍' : '🎫 Auto-fill'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#98989d] mt-1">
                    Paste a link from Ryanair, Wizz Air, LOT, PKP Intercity, or Booking.com to auto-fill flight/train details
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTransportForm(false)}
                  className="gh-btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTransport}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Transport'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Transport Modal */}
      {showEditTransportForm && editingTransport && (
        <div className="gh-modal-overlay" onClick={() => setShowEditTransportForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Edit Transportation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Transport Type *
                  </label>
                  <select
                    value={editingTransport.type}
                    onChange={(e) => setEditingTransport({ ...editingTransport, type: e.target.value as Transport['type'] })}
                    className="gh-select"
                  >
                    <option value="flight">✈️ Flight</option>
                    <option value="train">🚆 Train</option>
                    <option value="bus">🚌 Bus</option>
                    <option value="car">🚗 Car</option>
                    <option value="other">🚢 Other</option>
                  </select>
                </div>
                
                {/* Conditional field for Flight Number */}
                {editingTransport.type === 'flight' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Flight Number
                      <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(e.g., LO123, FR1234)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., LO123"
                      value={editingTransport.flightNumber || ''}
                      onChange={(e) => setEditingTransport({ ...editingTransport, flightNumber: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                )}
                
                {/* Conditional field for Train Number */}
                {editingTransport.type === 'train' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Train Number
                      <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(e.g., TLK 12345, IC 5002)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., TLK 12345"
                      value={editingTransport.trainNumber || ''}
                      onChange={(e) => setEditingTransport({ ...editingTransport, trainNumber: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      From *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Warsaw"
                      value={editingTransport.fromLocation}
                      onChange={(e) => setEditingTransport({ ...editingTransport, fromLocation: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      To *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Paris"
                      value={editingTransport.toLocation}
                      onChange={(e) => setEditingTransport({ ...editingTransport, toLocation: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Departure *
                    </label>
                    <input
                      type="datetime-local"
                      value={formatDateTimeForInput(editingTransport.departureDate)}
                      onChange={(e) => setEditingTransport({ ...editingTransport, departureDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Arrival *
                    </label>
                    <input
                      type="datetime-local"
                      value={formatDateTimeForInput(editingTransport.arrivalDate)}
                      onChange={(e) => setEditingTransport({ ...editingTransport, arrivalDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingTransport.price || ''}
                      onChange={(e) => setEditingTransport({ ...editingTransport, price: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={editingTransport.currency}
                      onChange={(e) => setEditingTransport({ ...editingTransport, currency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Ticket URL/Attachment
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editingTransport.bookingUrl || ''}
                    onChange={(e) => setEditingTransport({ ...editingTransport, bookingUrl: e.target.value })}
                    className="gh-input"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditTransportForm(false);
                    setEditingTransport(null);
                  }}
                  className="gh-btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditTransport}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Transport'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Attraction Modal */}
      {showAttractionForm && (
        <div className="gh-modal-overlay" onClick={() => {
          setShowAttractionForm(false);
          setSelectedStopForAttraction(null);
        }}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff]">Add Attraction</h2>
                <button
                  onClick={() => {
                    setShowAttractionForm(false);
                    setSelectedStopForAttraction(null);
                  }}
                  className="text-gray-600 dark:text-[#98989d] hover:text-gray-900 dark:text-[#ffffff]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Attraction Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Eiffel Tower"
                    value={newAttraction.name}
                    onChange={(e) => setNewAttraction({ ...newAttraction, name: e.target.value })}
                    className="gh-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Details about the attraction..."
                    value={newAttraction.description}
                    onChange={(e) => setNewAttraction({ ...newAttraction, description: e.target.value })}
                    className="gh-input h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Estimated Cost
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newAttraction.estimatedCost || ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, estimatedCost: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 2 hours"
                      value={newAttraction.duration}
                      onChange={(e) => setNewAttraction({ ...newAttraction, duration: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Address
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Street and number"
                      value={newAttraction.addressStreet || ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, addressStreet: e.target.value })}
                      className="gh-input"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        value={newAttraction.addressCity || ''}
                        onChange={(e) => setNewAttraction({ ...newAttraction, addressCity: e.target.value })}
                        className="gh-input"
                      />
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={newAttraction.addressPostalCode || ''}
                        onChange={(e) => setNewAttraction({ ...newAttraction, addressPostalCode: e.target.value })}
                        className="gh-input"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Country"
                      value={newAttraction.addressCountry || ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, addressCountry: e.target.value })}
                      className="gh-input"
                    />
                    <button
                      onClick={handleGeocodeAttraction}
                      disabled={geocodingAttraction}
                      className="gh-btn-secondary w-full flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      {geocodingAttraction ? 'Finding coordinates...' : 'Find Coordinates'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                        Latitude {newAttraction.latitude && '✓'}
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="Auto-filled"
                        value={newAttraction.latitude || ''}
                        onChange={(e) => setNewAttraction({ ...newAttraction, latitude: parseFloat(e.target.value) || undefined })}
                        className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                        Longitude {newAttraction.longitude && '✓'}
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="Auto-filled"
                        value={newAttraction.longitude || ''}
                        onChange={(e) => setNewAttraction({ ...newAttraction, longitude: parseFloat(e.target.value) || undefined })}
                        className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                        readOnly
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Visit Time
                    </label>
                    <input
                      type="time"
                      value={formatTimeForInput(newAttraction.visitTime)}
                      onChange={(e) => setNewAttraction({ ...newAttraction, visitTime: e.target.value })}
                      className="gh-input"
                      placeholder="HH:MM"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAttractionForm(false);
                    setSelectedStopForAttraction(null);
                  }}
                  className="gh-btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAttraction}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Attraction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attraction Modal */}
      {showEditAttractionForm && editingAttraction && (
        <div className="gh-modal-overlay" onClick={() => {
          setShowEditAttractionForm(false);
          setEditingAttraction(null);
          setEditingAttractionStopId(null);
        }}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff]">Edit Attraction</h2>
                <button
                  onClick={() => {
                    setShowEditAttractionForm(false);
                    setEditingAttraction(null);
                    setEditingAttractionStopId(null);
                  }}
                  className="text-gray-600 dark:text-[#98989d] hover:text-gray-900 dark:text-[#ffffff]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Attraction Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Eiffel Tower"
                    value={editingAttraction.name}
                    onChange={(e) => setEditingAttraction({ ...editingAttraction, name: e.target.value })}
                    className="gh-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Details about the attraction..."
                    value={editingAttraction.description || ''}
                    onChange={(e) => setEditingAttraction({ ...editingAttraction, description: e.target.value })}
                    className="gh-input h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Estimated Cost
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingAttraction.estimatedCost || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, estimatedCost: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 2 hours"
                      value={editingAttraction.duration || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, duration: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Address
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Street and number"
                      value={editingAttraction.addressStreet || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, addressStreet: e.target.value })}
                      className="gh-input"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        value={editingAttraction.addressCity || ''}
                        onChange={(e) => setEditingAttraction({ ...editingAttraction, addressCity: e.target.value })}
                        className="gh-input"
                      />
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={editingAttraction.addressPostalCode || ''}
                        onChange={(e) => setEditingAttraction({ ...editingAttraction, addressPostalCode: e.target.value })}
                        className="gh-input"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Country"
                      value={editingAttraction.addressCountry || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, addressCountry: e.target.value })}
                      className="gh-input"
                    />
                    <button
                      onClick={handleGeocodeEditAttraction}
                      disabled={geocodingEditAttraction}
                      className="gh-btn-secondary w-full flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      {geocodingEditAttraction ? 'Finding coordinates...' : 'Find Coordinates'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                        Latitude {editingAttraction.latitude && '✓'}
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="Auto-filled"
                        value={editingAttraction.latitude || ''}
                        onChange={(e) => setEditingAttraction({ ...editingAttraction, latitude: parseFloat(e.target.value) || undefined })}
                        className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                        Longitude {editingAttraction.longitude && '✓'}
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="Auto-filled"
                        value={editingAttraction.longitude || ''}
                        onChange={(e) => setEditingAttraction({ ...editingAttraction, longitude: parseFloat(e.target.value) || undefined })}
                        className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                        readOnly
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Visit Time
                    </label>
                    <input
                      type="time"
                      value={formatTimeForInput(editingAttraction.visitTime)}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, visitTime: e.target.value })}
                      className="gh-input"
                      placeholder="HH:MM"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditAttractionForm(false);
                    setEditingAttraction(null);
                    setEditingAttractionStopId(null);
                  }}
                  className="gh-btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditAttraction}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Attraction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.options.title}
        message={confirm.options.message}
        confirmText={confirm.options.confirmText}
        cancelText={confirm.options.cancelText}
        confirmVariant={confirm.options.confirmVariant}
        onConfirm={confirm.handleConfirm}
        onCancel={confirm.handleCancel}
      />
    </div>
  );
}

export default App;

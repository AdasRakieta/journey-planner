import { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, DollarSign, Plane, Train, Bus, Car, Menu, X, Trash2 } from 'lucide-react';
import JourneyMap from './components/JourneyMap';
import type { Journey, Stop, Transport } from './types/journey';
import { journeyService } from './services/api';

function App() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [showNewJourneyForm, setShowNewJourneyForm] = useState(false);
  const [showStopForm, setShowStopForm] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
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
  });

  useEffect(() => {
    loadJourneys();
  }, []);

  const loadJourneys = async () => {
    try {
      setLoading(true);
      const data = await journeyService.getAllJourneys();
      setJourneys(data);
    } catch (error) {
      console.error('Failed to load journeys:', error);
      alert('Failed to load journeys. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJourney = async () => {
    if (!newJourney.title || !newJourney.startDate || !newJourney.endDate) {
      alert('Please fill in all required fields');
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
    } catch (error) {
      console.error('Failed to create journey:', error);
      alert('Failed to create journey');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJourney = async (id: number) => {
    if (!confirm('Are you sure you want to delete this journey?')) return;

    try {
      setLoading(true);
      await journeyService.deleteJourney(id);
      setJourneys(journeys.filter(j => j.id !== id));
      if (selectedJourney?.id === id) {
        setSelectedJourney(null);
      }
    } catch (error) {
      console.error('Failed to delete journey:', error);
      alert('Failed to delete journey');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setNewStop({ ...newStop, latitude: lat, longitude: lng });
    setShowStopForm(true);
  };

  const handleAddStop = async () => {
    if (!selectedJourney || !newStop.city || !newStop.country) {
      alert('Please fill in city and country');
      return;
    }

    try {
      setLoading(true);
      const updatedJourney = {
        ...selectedJourney,
        stops: [...(selectedJourney.stops || []), newStop as Stop],
      };
      const updated = await journeyService.updateJourney(selectedJourney.id!, updatedJourney);
      setSelectedJourney(updated);
      setJourneys(journeys.map(j => j.id === updated.id ? updated : j));
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
    } catch (error) {
      console.error('Failed to add stop:', error);
      alert('Failed to add stop');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransport = async () => {
    if (!selectedJourney || !newTransport.fromLocation || !newTransport.toLocation) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const updatedJourney = {
        ...selectedJourney,
        transports: [...(selectedJourney.transports || []), newTransport as Transport],
      };
      const updated = await journeyService.updateJourney(selectedJourney.id!, updatedJourney);
      setSelectedJourney(updated);
      setJourneys(journeys.map(j => j.id === updated.id ? updated : j));
      setNewTransport({
        type: 'flight',
        fromLocation: '',
        toLocation: '',
        departureDate: '',
        arrivalDate: '',
        price: 0,
        currency: 'PLN',
        bookingUrl: '',
      });
      setShowTransportForm(false);
    } catch (error) {
      console.error('Failed to add transport:', error);
      alert('Failed to add transport');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateCost = async () => {
    if (!selectedJourney?.id) return;

    try {
      setLoading(true);
      const result = await journeyService.calculateTotalCost(selectedJourney.id);
      const updated = await journeyService.getJourneyById(selectedJourney.id);
      setSelectedJourney(updated);
      setJourneys(journeys.map(j => j.id === updated.id ? updated : j));
      alert(`Total cost calculated: ${result.totalCost} ${result.currency}`);
    } catch (error) {
      console.error('Failed to calculate cost:', error);
      alert('Failed to calculate cost');
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gh-bg-primary font-github">
      {/* Header with Burger Menu */}
      <header className="bg-gh-bg-secondary border-b border-gh-border-default sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gh-bg-tertiary rounded-gh transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-gh-text-primary" />
                ) : (
                  <Menu className="w-6 h-6 text-gh-text-primary" />
                )}
              </button>
              <h1 className="text-xl font-semibold text-gh-text-primary">
                🗺️ Journey Planner
              </h1>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={() => setShowNewJourneyForm(true)}
                className="gh-btn-primary"
                disabled={loading}
              >
                <Plus className="w-5 h-5" />
                New Journey
              </button>
            </div>

            {/* Mobile New Journey Button */}
            <button
              onClick={() => setShowNewJourneyForm(true)}
              className="lg:hidden p-2 hover:bg-gh-bg-tertiary rounded-gh transition-colors"
              disabled={loading}
            >
              <Plus className="w-6 h-6 text-gh-accent-primary" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gh-border-default bg-gh-bg-secondary">
            <div className="px-4 py-3 space-y-2">
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
              <h2 className="text-lg font-semibold mb-4 text-gh-text-primary">Your Journeys</h2>
              <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                {loading && journeys.length === 0 ? (
                  <p className="text-sm text-gh-text-secondary text-center py-8">
                    Loading journeys...
                  </p>
                ) : journeys.length === 0 ? (
                  <p className="text-sm text-gh-text-secondary text-center py-8">
                    No journeys yet. Create your first journey!
                  </p>
                ) : (
                  journeys.map((journey) => (
                    <div
                      key={journey.id}
                      className={`p-4 rounded-gh border transition-all ${
                        selectedJourney?.id === journey.id
                          ? 'bg-gh-accent-emphasis bg-opacity-10 border-gh-accent-primary'
                          : 'bg-gh-bg-tertiary border-gh-border-muted hover:border-gh-border-default'
                      }`}
                    >
                      <div
                        onClick={() => setSelectedJourney(journey)}
                        className="cursor-pointer"
                      >
                        <h3 className="font-semibold text-gh-text-primary">{journey.title}</h3>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gh-text-secondary">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(journey.startDate).toLocaleDateString()} -{' '}
                            {new Date(journey.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        {journey.totalEstimatedCost && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-gh-text-success">
                            <DollarSign className="w-4 h-4" />
                            <span>
                              {journey.totalEstimatedCost} {journey.currency}
                            </span>
                          </div>
                        )}
                      </div>
                      {selectedJourney?.id === journey.id && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gh-border-muted">
                          <button
                            onClick={handleCalculateCost}
                            className="flex-1 px-3 py-1.5 text-sm gh-btn-secondary"
                            disabled={loading}
                          >
                            <DollarSign className="w-4 h-4" />
                            Calculate Cost
                          </button>
                          <button
                            onClick={() => handleDeleteJourney(journey.id!)}
                            className="px-3 py-1.5 text-sm bg-gh-accent-danger hover:bg-red-700 text-white rounded-gh transition-colors"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                  })) || []
                }
                onMapClick={selectedJourney ? handleMapClick : undefined}
                center={
                  selectedJourney?.stops && selectedJourney.stops.length > 0
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
                    <h2 className="text-2xl font-bold text-gh-text-primary">{selectedJourney.title}</h2>
                    {selectedJourney.description && (
                      <p className="text-gh-text-secondary mt-2">{selectedJourney.description}</p>
                    )}
                  </div>
                </div>

                {/* Stops */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gh-text-primary">Stops</h3>
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
                        <div key={index} className="bg-gh-bg-tertiary p-4 rounded-gh border border-gh-border-muted">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-gh-accent-primary mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gh-text-primary">
                                {stop.city}, {stop.country}
                              </h4>
                              <p className="text-sm text-gh-text-secondary mt-1">
                                {new Date(stop.arrivalDate).toLocaleDateString()} -{' '}
                                {new Date(stop.departureDate).toLocaleDateString()}
                              </p>
                              {stop.accommodationName && (
                                <div className="mt-2 text-sm">
                                  <p className="font-medium text-gh-text-primary">Accommodation:</p>
                                  <p className="text-gh-text-secondary">{stop.accommodationName}</p>
                                  {stop.accommodationPrice && (
                                    <p className="text-gh-text-success">
                                      {stop.accommodationPrice} {stop.accommodationCurrency}
                                    </p>
                                  )}
                                  {stop.accommodationUrl && (
                                    <a
                                      href={stop.accommodationUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gh-text-link hover:underline"
                                    >
                                      View booking →
                                    </a>
                                  )}
                                </div>
                              )}
                              {stop.attractions && stop.attractions.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium text-gh-text-primary">Attractions:</p>
                                  <ul className="text-sm space-y-1 mt-1">
                                    {stop.attractions.map((attr, i) => (
                                      <li key={i} className="text-gh-text-secondary">
                                        • {attr.name}
                                        {attr.estimatedCost && ` - ${attr.estimatedCost} ${selectedJourney.currency}`}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gh-text-secondary text-center py-4">
                        No stops yet. Click on the map to add your first stop!
                      </p>
                    )}
                  </div>
                </div>

                {/* Transportation */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gh-text-primary">Transportation</h3>
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
                        <div key={index} className="bg-gh-bg-tertiary p-4 rounded-gh border border-gh-border-muted">
                          <div className="flex items-start gap-3">
                            <div className="text-gh-accent-primary mt-1 flex-shrink-0">
                              {getTransportIcon(transport.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold capitalize text-gh-text-primary">{transport.type}</h4>
                              <p className="text-sm text-gh-text-secondary">
                                {transport.fromLocation} → {transport.toLocation}
                              </p>
                              <p className="text-sm text-gh-text-secondary mt-1">
                                {new Date(transport.departureDate).toLocaleString()} -{' '}
                                {new Date(transport.arrivalDate).toLocaleString()}
                              </p>
                              <p className="text-sm font-medium text-gh-text-success mt-1">
                                {transport.price} {transport.currency}
                              </p>
                              {transport.bookingUrl && (
                                <a
                                  href={transport.bookingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-gh-text-link hover:underline"
                                >
                                  View booking →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gh-text-secondary text-center py-4">
                        No transportation added yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="gh-card text-center py-12">
                <MapPin className="w-16 h-16 text-gh-text-secondary mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-gh-text-primary mb-2">
                  No Journey Selected
                </h3>
                <p className="text-gh-text-secondary">
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
              <h2 className="text-2xl font-bold text-gh-text-primary mb-6">Create New Journey</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                  <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                  <label className="block text-sm font-medium text-gh-text-primary mb-2">
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

      {/* Add Stop Modal */}
      {showStopForm && (
        <div className="gh-modal-overlay" onClick={() => setShowStopForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gh-text-primary mb-6">Add Stop</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                <div>
                  <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                  <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                <div className="bg-gh-bg-tertiary p-3 rounded-gh border border-gh-border-muted">
                  <p className="text-sm text-gh-text-secondary">
                    📍 Coordinates: {newStop.latitude?.toFixed(4)}, {newStop.longitude?.toFixed(4)}
                  </p>
                  <p className="text-xs text-gh-text-secondary mt-1">
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

      {/* Add Transport Modal */}
      {showTransportForm && (
        <div className="gh-modal-overlay" onClick={() => setShowTransportForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gh-text-primary mb-6">Add Transportation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                    <label className="block text-sm font-medium text-gh-text-primary mb-2">
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
                  <label className="block text-sm font-medium text-gh-text-primary mb-2">
                    Booking URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newTransport.bookingUrl}
                    onChange={(e) => setNewTransport({ ...newTransport, bookingUrl: e.target.value })}
                    className="gh-input"
                  />
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
    </div>
  );
}

export default App;


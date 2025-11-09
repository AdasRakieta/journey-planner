import { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, DollarSign, Plane, Train, Bus, Car, Menu, X, Trash2, Edit, Save } from 'lucide-react';
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
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedJourney.stops?.map((stop, index) => (
                      <div key={index} className="bg-ios-gray-50 p-4 rounded-ios">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-ios-blue mt-1" />
                          <div className="flex-1">
                            <h4 className="font-semibold">
                              {stop.city}, {stop.country}
                            </h4>
                            <p className="text-sm text-ios-gray-600 mt-1">
                              {new Date(stop.arrivalDate).toLocaleDateString()} -{' '}
                              {new Date(stop.departureDate).toLocaleDateString()}
                            </p>
                            {stop.accommodationName && (
                              <div className="mt-2 text-sm">
                                <p className="font-medium">Accommodation:</p>
                                <p>{stop.accommodationName}</p>
                                {stop.accommodationPrice && (
                                  <p className="text-ios-gray-600">
                                    {stop.accommodationPrice} {stop.accommodationCurrency}
                                  </p>
                                )}
                                {stop.accommodationUrl && (
                                  <a
                                    href={stop.accommodationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-ios-blue underline"
                                  >
                                    View booking
                                  </a>
                                )}
                              </div>
                            )}
                            {stop.attractions && stop.attractions.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium">Attractions:</p>
                                <ul className="text-sm space-y-1 mt-1">
                                  {stop.attractions.map((attr, i) => (
                                    <li key={i} className="text-ios-gray-600">
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
                    ))}
                  </div>
                </div>

                {/* Transports */}
                {selectedJourney.transports && selectedJourney.transports.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Transportation</h3>
                    <div className="space-y-3">
                      {selectedJourney.transports.map((transport, index) => (
                        <div key={index} className="bg-ios-gray-50 p-4 rounded-ios">
                          <div className="flex items-start gap-3">
                            <div className="text-ios-blue mt-1">
                              {getTransportIcon(transport.type)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold capitalize">{transport.type}</h4>
                              <p className="text-sm text-ios-gray-600">
                                {transport.fromLocation} → {transport.toLocation}
                              </p>
                              <p className="text-sm text-ios-gray-600 mt-1">
                                {new Date(transport.departureDate).toLocaleString()} -{' '}
                                {new Date(transport.arrivalDate).toLocaleString()}
                              </p>
                              <p className="text-sm font-medium mt-1">
                                {transport.price} {transport.currency}
                              </p>
                              {transport.bookingUrl && (
                                <a
                                  href={transport.bookingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-ios-blue underline"
                                >
                                  View booking
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Journey Modal */}
      {showNewJourneyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-ios-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Journey</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Journey Title"
                value={newJourney.title}
                onChange={(e) => setNewJourney({ ...newJourney, title: e.target.value })}
                className="ios-input"
              />
              <textarea
                placeholder="Description (optional)"
                value={newJourney.description}
                onChange={(e) => setNewJourney({ ...newJourney, description: e.target.value })}
                className="ios-input"
                rows={3}
              />
              <input
                type="date"
                placeholder="Start Date"
                value={newJourney.startDate as string}
                onChange={(e) => setNewJourney({ ...newJourney, startDate: e.target.value })}
                className="ios-input"
              />
              <input
                type="date"
                placeholder="End Date"
                value={newJourney.endDate as string}
                onChange={(e) => setNewJourney({ ...newJourney, endDate: e.target.value })}
                className="ios-input"
              />
              <select
                value={newJourney.currency}
                onChange={(e) => setNewJourney({ ...newJourney, currency: e.target.value })}
                className="ios-input"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="PLN">PLN</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewJourneyForm(false)} className="ios-button-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleCreateJourney} className="ios-button flex-1">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stop Modal */}
      {showStopForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-ios-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Stop</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="City"
                value={newStop.city}
                onChange={(e) => setNewStop({ ...newStop, city: e.target.value })}
                className="ios-input"
              />
              <input
                type="text"
                placeholder="Country"
                value={newStop.country}
                onChange={(e) => setNewStop({ ...newStop, country: e.target.value })}
                className="ios-input"
              />
              <input
                type="date"
                placeholder="Arrival Date"
                value={newStop.arrivalDate as string}
                onChange={(e) => setNewStop({ ...newStop, arrivalDate: e.target.value })}
                className="ios-input"
              />
              <input
                type="date"
                placeholder="Departure Date"
                value={newStop.departureDate as string}
                onChange={(e) => setNewStop({ ...newStop, departureDate: e.target.value })}
                className="ios-input"
              />
              <p className="text-sm text-ios-gray-600">
                Coordinates: {newStop.latitude?.toFixed(4)}, {newStop.longitude?.toFixed(4)}
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowStopForm(false)} className="ios-button-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleAddStop} className="ios-button flex-1">
                Add Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


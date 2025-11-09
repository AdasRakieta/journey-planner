import { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, DollarSign, Plane, Train, Bus, Car } from 'lucide-react';
import JourneyMap from './components/JourneyMap';
import type { Journey, Stop } from './types/journey';
import { journeyService } from './services/api';

function App() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [showNewJourneyForm, setShowNewJourneyForm] = useState(false);
  const [newJourney, setNewJourney] = useState<Partial<Journey>>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    currency: 'USD',
    stops: [],
    transports: [],
  });
  const [showStopForm, setShowStopForm] = useState(false);
  const [newStop, setNewStop] = useState<Partial<Stop>>({
    city: '',
    country: '',
    latitude: 51.505,
    longitude: -0.09,
  });

  useEffect(() => {
    loadJourneys();
  }, []);

  const loadJourneys = async () => {
    try {
      const data = await journeyService.getAllJourneys();
      setJourneys(data);
    } catch (error) {
      console.error('Failed to load journeys:', error);
    }
  };

  const handleCreateJourney = async () => {
    try {
      const created = await journeyService.createJourney(newJourney);
      setJourneys([created, ...journeys]);
      setShowNewJourneyForm(false);
      setNewJourney({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        currency: 'USD',
        stops: [],
        transports: [],
      });
    } catch (error) {
      console.error('Failed to create journey:', error);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setNewStop({ ...newStop, latitude: lat, longitude: lng });
    setShowStopForm(true);
  };

  const handleAddStop = () => {
    if (selectedJourney && newStop.city) {
      const updatedStops = [...(selectedJourney.stops || []), newStop as Stop];
      setSelectedJourney({ ...selectedJourney, stops: updatedStops });
      setNewStop({
        city: '',
        country: '',
        latitude: 51.505,
        longitude: -0.09,
      });
      setShowStopForm(false);
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
    <div className="min-h-screen bg-ios-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-ios-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-ios-gray-900">Journey Planner</h1>
            <button
              onClick={() => setShowNewJourneyForm(true)}
              className="ios-button flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Journey
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Journey List */}
          <div className="lg:col-span-1">
            <div className="ios-card">
              <h2 className="text-lg font-semibold mb-4 text-ios-gray-900">Your Journeys</h2>
              <div className="space-y-3">
                {journeys.length === 0 ? (
                  <p className="text-sm text-ios-gray-500 text-center py-8">
                    No journeys yet. Create your first journey!
                  </p>
                ) : (
                  journeys.map((journey) => (
                    <div
                      key={journey.id}
                      onClick={() => setSelectedJourney(journey)}
                      className={`p-4 rounded-ios cursor-pointer transition-all ${
                        selectedJourney?.id === journey.id
                          ? 'bg-ios-blue text-white'
                          : 'bg-ios-gray-50 hover:bg-ios-gray-100'
                      }`}
                    >
                      <h3 className="font-semibold">{journey.title}</h3>
                      <div className="flex items-center gap-2 mt-2 text-sm opacity-80">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(journey.startDate).toLocaleDateString()} -{' '}
                          {new Date(journey.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      {journey.totalEstimatedCost && (
                        <div className="flex items-center gap-2 mt-1 text-sm opacity-80">
                          <DollarSign className="w-4 h-4" />
                          <span>
                            {journey.totalEstimatedCost} {journey.currency}
                          </span>
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
            <div className="ios-card p-0 overflow-hidden" style={{ height: '500px' }}>
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
            {selectedJourney && (
              <div className="ios-card">
                <h2 className="text-xl font-bold mb-4">{selectedJourney.title}</h2>
                {selectedJourney.description && (
                  <p className="text-ios-gray-600 mb-4">{selectedJourney.description}</p>
                )}

                {/* Stops */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">Stops</h3>
                    <button
                      onClick={() => setShowStopForm(true)}
                      className="ios-button-secondary text-sm"
                    >
                      Add Stop
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


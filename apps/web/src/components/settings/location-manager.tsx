import { useState, useCallback } from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Check,
  X,
  Home,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { api, type Id } from "@flow-day/convex"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface EditingLocation {
  id: Id<"locations">
  label: string
  address: string
}

// Location type from the Convex query
type Location = NonNullable<Awaited<ReturnType<typeof api.locations.getLocations._returnType>>>[number]

export function LocationManager() {
  const locations = useQuery(api.locations.getLocations)
  const addLocation = useMutation(api.locations.addLocation)
  const updateLocation = useMutation(api.locations.updateLocation)
  const deleteLocation = useMutation(api.locations.deleteLocation)
  const geocodeAddress = useAction(api.maps.geocodeAddress)
  const getTravelTime = useAction(api.maps.getTravelTime)

  const [isExpanded, setIsExpanded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingLocation, setEditingLocation] = useState<EditingLocation | null>(null)
  const [deletingId, setDeletingId] = useState<Id<"locations"> | null>(null)
  const [travelTimes, setTravelTimes] = useState<Record<Id<"locations">, number>>({})
  const [loadingTravelTimes, setLoadingTravelTimes] = useState(false)

  // Get icon for location label
  const getLocationIcon = (label: string) => {
    const lowerLabel = label.toLowerCase()
    if (lowerLabel === "home") return <Home className="h-4 w-4" />
    if (lowerLabel === "work" || lowerLabel === "office") return <Briefcase className="h-4 w-4" />
    return <MapPin className="h-4 w-4" />
  }

  // Add new location
  const handleAddLocation = useCallback(async () => {
    if (!newLabel.trim() || !newAddress.trim()) {
      toast.error("Please enter both a label and address")
      return
    }

    setIsGeocoding(true)
    try {
      const result = await geocodeAddress({ address: newAddress })

      setIsSaving(true)
      await addLocation({
        label: newLabel.trim(),
        address: result.formattedAddress,
        coordinates: { lat: result.lat, lng: result.lng },
        isDefault: locations?.length === 0, // First location is default
      })

      toast.success(`Added "${newLabel}" location`)
      setNewLabel("")
      setNewAddress("")
      setShowAddForm(false)
    } catch (error) {
      console.error("Failed to add location:", error)
      toast.error("Could not find that address. Please try again.")
    } finally {
      setIsGeocoding(false)
      setIsSaving(false)
    }
  }, [newLabel, newAddress, geocodeAddress, addLocation, locations?.length])

  // Update existing location
  const handleUpdateLocation = useCallback(async () => {
    if (!editingLocation) return

    if (!editingLocation.label.trim() || !editingLocation.address.trim()) {
      toast.error("Please enter both a label and address")
      return
    }

    setIsGeocoding(true)
    try {
      const result = await geocodeAddress({ address: editingLocation.address })

      await updateLocation({
        locationId: editingLocation.id,
        label: editingLocation.label.trim(),
        address: result.formattedAddress,
        coordinates: { lat: result.lat, lng: result.lng },
      })

      toast.success("Location updated")
      setEditingLocation(null)
    } catch (error) {
      console.error("Failed to update location:", error)
      toast.error("Could not update location. Please try again.")
    } finally {
      setIsGeocoding(false)
    }
  }, [editingLocation, geocodeAddress, updateLocation])

  // Delete location
  const handleDeleteLocation = useCallback(async (locationId: Id<"locations">) => {
    setDeletingId(locationId)
    try {
      await deleteLocation({ locationId })
      toast.success("Location deleted")
    } catch (error) {
      console.error("Failed to delete location:", error)
      toast.error("Could not delete location")
    } finally {
      setDeletingId(null)
    }
  }, [deleteLocation])

  // Load travel times from home to all other locations
  const loadTravelTimes = useCallback(async () => {
    if (!locations || locations.length < 2) return

    const homeLocation = locations.find((l: Location) => l.isDefault) || locations.find((l: Location) => l.label.toLowerCase() === "home")
    if (!homeLocation) return

    setLoadingTravelTimes(true)
    const times: Record<Id<"locations">, number> = {}

    for (const loc of locations) {
      if (loc._id === homeLocation._id) continue

      // Check if both have valid coordinates
      if (
        (loc.coordinates.lat === 0 && loc.coordinates.lng === 0) ||
        (homeLocation.coordinates.lat === 0 && homeLocation.coordinates.lng === 0)
      ) {
        continue
      }

      try {
        const result = await getTravelTime({
          fromLocationId: homeLocation._id,
          toLocationId: loc._id,
        })
        if (result) {
          times[loc._id] = result.travelTimeMinutes
        }
      } catch (error) {
        console.error("Failed to get travel time:", error)
      }
    }

    setTravelTimes(times)
    setLoadingTravelTimes(false)
  }, [locations, getTravelTime])

  // Loading state
  if (locations === undefined) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle>Locations</CardTitle>
          </div>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
              <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-base">Locations</CardTitle>
              <CardDescription>
                {locations.length === 0
                  ? "Add locations for travel time estimates"
                  : `${locations.length} location${locations.length === 1 ? "" : "s"} saved`}
              </CardDescription>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Existing Locations List */}
          {locations.length > 0 && (
            <div className="space-y-3">
              {locations.map((location: Location) => (
                <div
                  key={location._id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    location.isDefault && "border-primary/30 bg-primary/5"
                  )}
                >
                  {editingLocation?.id === location._id ? (
                    // Editing mode
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Label"
                          value={editingLocation!.label}
                          onChange={(e) => setEditingLocation(prev => prev ? { ...prev, label: e.target.value } : null)}
                          className="flex-1"
                        />
                      </div>
                      <Input
                        placeholder="Address"
                        value={editingLocation!.address}
                        onChange={(e) => setEditingLocation(prev => prev ? { ...prev, address: e.target.value } : null)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdateLocation}
                          disabled={isGeocoding}
                        >
                          {isGeocoding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingLocation(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          {getLocationIcon(location.label)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{location.label}</span>
                            {location.isDefault && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {location.address}
                          </p>
                          {travelTimes[location._id] && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {travelTimes[location._id]} min from home
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingLocation({
                              id: location._id,
                              label: location.label,
                              address: location.address,
                            })
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteLocation(location._id)
                          }}
                          disabled={deletingId === location._id}
                          className="text-destructive hover:text-destructive"
                        >
                          {deletingId === location._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Load travel times button */}
              {locations.length >= 2 && Object.keys(travelTimes).length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTravelTimes}
                  disabled={loadingTravelTimes}
                  className="w-full"
                >
                  {loadingTravelTimes ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="mr-2 h-4 w-4" />
                  )}
                  Calculate travel times
                </Button>
              )}
            </div>
          )}

          {/* Add New Location Form */}
          {showAddForm ? (
            <div className="space-y-3 rounded-lg border border-dashed p-4">
              <Label>Add New Location</Label>
              <Input
                placeholder="Label (e.g., Gym, Office)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <Input
                placeholder="Address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddLocation}
                  disabled={isGeocoding || isSaving}
                >
                  {isGeocoding || isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Add Location
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewLabel("")
                    setNewAddress("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}

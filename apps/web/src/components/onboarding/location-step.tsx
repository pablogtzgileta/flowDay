import { useState, useCallback } from "react"
import { useMutation, useAction } from "convex/react"
import { MapPin, Loader2, Check, Navigation, Briefcase, Home } from "lucide-react"
import { toast } from "sonner"

import { api } from "@flow-day/convex"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface LocationData {
  label: string
  address: string
  coordinates: { lat: number; lng: number } | null
  formattedAddress: string | null
  isGeocoding: boolean
  isGeocoded: boolean
}

interface LocationStepProps {
  onLocationsChange?: (hasLocations: boolean) => void
}

export function LocationStep({ onLocationsChange }: LocationStepProps) {
  const [homeLocation, setHomeLocation] = useState<LocationData>({
    label: "Home",
    address: "",
    coordinates: null,
    formattedAddress: null,
    isGeocoding: false,
    isGeocoded: false,
  })

  const [workLocation, setWorkLocation] = useState<LocationData>({
    label: "Work",
    address: "",
    coordinates: null,
    formattedAddress: null,
    isGeocoding: false,
    isGeocoded: false,
  })

  const [travelTime, setTravelTime] = useState<number | null>(null)
  const [isCalculatingTravel, setIsCalculatingTravel] = useState(false)
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false)
  const [geolocationSupported] = useState(() => "geolocation" in navigator)

  const addLocation = useMutation(api.locations.addLocation)
  const geocodeAddress = useAction(api.maps.geocodeAddress)
  const getTravelTime = useAction(api.maps.getTravelTime)

  // Handle address blur to geocode
  const handleAddressBlur = useCallback(async (
    location: LocationData,
    setLocation: React.Dispatch<React.SetStateAction<LocationData>>
  ) => {
    if (!location.address.trim() || location.isGeocoded) {
      return
    }

    setLocation(prev => ({ ...prev, isGeocoding: true }))

    try {
      const result = await geocodeAddress({ address: location.address })
      setLocation(prev => ({
        ...prev,
        coordinates: { lat: result.lat, lng: result.lng },
        formattedAddress: result.formattedAddress,
        isGeocoding: false,
        isGeocoded: true,
      }))
      onLocationsChange?.(true)
    } catch (error) {
      console.error("Geocoding failed:", error)
      setLocation(prev => ({
        ...prev,
        isGeocoding: false,
        isGeocoded: false,
      }))
      toast.error("Could not find that address. Please try a more specific address.")
    }
  }, [geocodeAddress, onLocationsChange])

  // Handle using current location for home
  const handleUseCurrentLocation = useCallback(async () => {
    if (!geolocationSupported) {
      toast.error("Geolocation is not supported by your browser")
      return
    }

    setIsUsingCurrentLocation(true)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      const { latitude, longitude } = position.coords

      // Reverse geocode to get address
      // For now, we'll set coordinates and let user enter address manually
      // Since we don't have reverse geocoding API readily available
      setHomeLocation(prev => ({
        ...prev,
        coordinates: { lat: latitude, lng: longitude },
        formattedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        isGeocoded: true,
        address: prev.address || "Current Location",
      }))
      onLocationsChange?.(true)
      toast.success("Location detected successfully")
    } catch (error) {
      console.error("Geolocation error:", error)
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied. Please enter your address manually.")
            break
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable. Please enter your address manually.")
            break
          case error.TIMEOUT:
            toast.error("Location request timed out. Please enter your address manually.")
            break
        }
      } else {
        toast.error("Could not get your location. Please enter your address manually.")
      }
    } finally {
      setIsUsingCurrentLocation(false)
    }
  }, [geolocationSupported, onLocationsChange])

  // Calculate travel time when both locations are geocoded
  const calculateTravelTime = useCallback(async () => {
    if (!homeLocation.coordinates || !workLocation.coordinates) {
      return
    }

    setIsCalculatingTravel(true)

    try {
      // First save both locations to get IDs
      const homeId = await addLocation({
        label: "Home",
        address: homeLocation.formattedAddress || homeLocation.address,
        coordinates: homeLocation.coordinates,
        isDefault: true,
      })

      const workId = await addLocation({
        label: "Work",
        address: workLocation.formattedAddress || workLocation.address,
        coordinates: workLocation.coordinates,
      })

      // Get travel time
      const result = await getTravelTime({
        fromLocationId: homeId,
        toLocationId: workId,
      })

      if (result) {
        setTravelTime(result.travelTimeMinutes)
        toast.success(`Travel time: ${result.travelTimeMinutes} minutes`)
      }
    } catch (error) {
      console.error("Failed to calculate travel time:", error)
      // Locations might still be saved even if travel time fails
      toast.error("Could not calculate travel time. Locations saved.")
    } finally {
      setIsCalculatingTravel(false)
    }
  }, [homeLocation, workLocation, addLocation, getTravelTime])


  return (
    <div className="text-center">
      <div className="mb-6 text-5xl">
        <MapPin className="mx-auto h-12 w-12 text-primary" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">Where do you spend your time?</h2>
      <p className="mb-6 text-muted-foreground">
        Add your locations to get travel time estimates in your schedule
      </p>

      <div className="space-y-6 text-left">
        {/* Home Location */}
        <Card className={cn(
          "transition-colors",
          homeLocation.isGeocoded && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
        )}>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              <Label className="text-base font-semibold">Home</Label>
              {homeLocation.isGeocoded && (
                <Check className="ml-auto h-5 w-5 text-green-600" />
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Enter your home address"
                  value={homeLocation.address}
                  onChange={(e) => setHomeLocation(prev => ({
                    ...prev,
                    address: e.target.value,
                    isGeocoded: false,
                    coordinates: null,
                    formattedAddress: null,
                  }))}
                  onBlur={() => handleAddressBlur(homeLocation, setHomeLocation)}
                  disabled={homeLocation.isGeocoding}
                />
                {homeLocation.isGeocoding && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {homeLocation.formattedAddress && (
                <p className="text-sm text-muted-foreground">
                  {homeLocation.formattedAddress}
                </p>
              )}

              {geolocationSupported && !homeLocation.isGeocoded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  disabled={isUsingCurrentLocation}
                  className="w-full"
                >
                  {isUsingCurrentLocation ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="mr-2 h-4 w-4" />
                  )}
                  Use current location
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Work Location */}
        <Card className={cn(
          "transition-colors",
          workLocation.isGeocoded && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
        )}>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <Label className="text-base font-semibold">Work</Label>
                <span className="text-sm text-muted-foreground">(optional)</span>
              </div>
              {workLocation.isGeocoded && (
                <Check className="h-5 w-5 text-green-600" />
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Enter your work address"
                  value={workLocation.address}
                  onChange={(e) => setWorkLocation(prev => ({
                    ...prev,
                    address: e.target.value,
                    isGeocoded: false,
                    coordinates: null,
                    formattedAddress: null,
                  }))}
                  onBlur={() => handleAddressBlur(workLocation, setWorkLocation)}
                  disabled={workLocation.isGeocoding}
                />
                {workLocation.isGeocoding && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {workLocation.formattedAddress && (
                <p className="text-sm text-muted-foreground">
                  {workLocation.formattedAddress}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Travel Time Section */}
        {homeLocation.isGeocoded && workLocation.isGeocoded && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Commute Time</p>
                  {travelTime !== null ? (
                    <p className="text-2xl font-bold text-primary">
                      {travelTime} min
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Calculate your typical commute
                    </p>
                  )}
                </div>
                {travelTime === null && (
                  <Button
                    onClick={calculateTravelTime}
                    disabled={isCalculatingTravel}
                  >
                    {isCalculatingTravel ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Calculate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skip hint */}
        <p className="text-center text-sm text-muted-foreground">
          You can skip this step and add locations later in Settings
        </p>
      </div>
    </div>
  )
}

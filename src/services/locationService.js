import * as Location from 'expo-location';

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  return status === Location.PermissionStatus.GRANTED;
}

export async function getCurrentCoordinates() {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    throw new Error('Permissao de localizacao negada.');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export async function getCurrentLocationDetails() {
  const coordinates = await getCurrentCoordinates();
  const [address] = await Location.reverseGeocodeAsync(coordinates);

  const state = address?.region || 'Estado nao identificado';
  const municipality = address?.city || address?.subregion || 'Municipio nao identificado';
  const neighborhood =
    address?.neighborhood ||
    address?.district ||
    address?.subregion ||
    'Bairro nao identificado';

  const locationDetails = {
    ...coordinates,
    state,
    municipality,
    neighborhood,
  };

  return locationDetails;
}

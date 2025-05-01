// Estado de la aplicación
let appState = {
  loading: false,
  lastUpdate: null,
  currentData: null
};

// Función para mostrar estado de carga
function setLoadingState(isLoading) {
  appState.loading = isLoading;
  const loader = document.getElementById('loadingIndicator');
  if (loader) {
    loader.style.display = isLoading ? 'block' : 'none';
  }
}

// Función mejorada para cargar datos iniciales
async function loadInitialData() {
  setLoadingState(true);
  try {
    // Cargar estadísticas globales
    const [statsResponse, countriesResponse] = await Promise.all([
      fetch('/api/stats'),
      fetch('/api/countries')
    ]);

    if (!statsResponse.ok || !countriesResponse.ok) {
      throw new Error('Error al cargar datos iniciales');
    }

    const [stats, countries] = await Promise.all([
      statsResponse.json(),
      countriesResponse.json()
    ]);

    // Actualizar el estado de la aplicación
    appState.lastUpdate = new Date();
    appState.currentData = stats;

    // Actualizar UI
    updateDataUI(stats);
    updateCountriesDropdown(countries);
    
    // Actualizar gráficos automáticamente
    await updateCharts();
    
  } catch (error) {
    console.error('Error loading initial data:', error);
    showErrorState();
  } finally {
    setLoadingState(false);
  }
}

// Función para actualizar la UI con nuevos datos
function updateDataUI(data) {
  document.getElementById('totalCases').textContent = 
    data.totalCases?.toLocaleString() || 'N/A';
  document.getElementById('totalDeaths').textContent = 
    data.totalDeaths?.toLocaleString() || 'N/A';
  document.getElementById('totalVaccinations').textContent = 
    data.totalVaccinations?.toLocaleString() || 'N/A';
  document.getElementById('lastUpdate').textContent = 
    data.lastDate ? new Date(data.lastDate).toLocaleString() : 'N/A';
}

// Función para actualizar el dropdown de países
function updateCountriesDropdown(countries) {
  const countrySelect = document.getElementById('countrySelect');
  countrySelect.innerHTML = '<option value="">All Countries</option>';
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });
}

// Función para mostrar estado de error
function showErrorState() {
  document.getElementById('totalCases').textContent = 'Error';
  document.getElementById('totalDeaths').textContent = 'Error';
  document.getElementById('totalVaccinations').textContent = 'Error';
  document.getElementById('lastUpdate').textContent = 'Error';
}

// Función mejorada para actualizar gráficos
async function updateCharts() {
  if (appState.loading) return;
  
  setLoadingState(true);
  try {
    const country = document.getElementById('countrySelect').value;
    const metric = document.getElementById('metricSelect').value;
    const period = document.getElementById('timePeriod').value;

    // Obtener datos para todos los gráficos en paralelo
    const [timeSeriesData, geoData, mortalityData] = await Promise.all([
      CovidAPI.getTimeSeriesData(country, metric, period),
      CovidAPI.getGeoData(metric, period),
      CovidAPI.getMortalityRateData(period)
    ]);

    // Actualizar gráficos solo si hay datos
    if (timeSeriesData?.length) {
      Charts.createTimeSeriesChart('timeSeriesChart', timeSeriesData, metric);
    }
    
    if (geoData?.length) {
      Charts.createGeoChart('geoChart', geoData, metric);
      Charts.createBarChart('barChart', geoData, metric);
    }
    
    if (mortalityData?.length) {
      Charts.createMortalityRateChart('mortalityRateChart', mortalityData);
    }

    // Actualizar scatter plot
    if (geoData) {
      const deathsData = await CovidAPI.getGeoData('TotalDeaths', period);
      if (deathsData) {
        const combinedData = geoData.map(item => {
          const deathItem = deathsData.find(d => d.CountryName === item.CountryName);
          return {
            ...item,
            TotalDeaths: deathItem ? deathItem.value : 0
          };
        }).filter(d => d.value > 0 && d.TotalDeaths > 0);
        
        if (combinedData.length) {
          Charts.createScatterPlot('scatterPlot', combinedData);
        }
      }
    }
    
  } catch (error) {
    console.error('Error updating charts:', error);
    // Opcional: Mostrar notificación al usuario
  } finally {
    setLoadingState(false);
  }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  // Configurar evento de actualización
  document.getElementById('updateCharts').addEventListener('click', updateCharts);
  
  // Cargar datos iniciales
  loadInitialData();
  
  // Actualizar automáticamente cada 5 minutos
  setInterval(loadInitialData, 5 * 60 * 1000);
});
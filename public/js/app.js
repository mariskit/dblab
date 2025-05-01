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
    const [statsResponse, countriesResponse] = await Promise.all([
      CovidAPI.getGlobalStats(),
      CovidAPI.getCountriesList()
    ]);

    // Actualizar el estado de la aplicación
    appState.lastUpdate = new Date();
    appState.currentData = statsResponse;

    // Actualizar UI
    updateDataUI(statsResponse);
    updateCountriesDropdown(countriesResponse);
    
    // Actualizar gráficos con métrica por defecto
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
  if (!data) return;
  
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
  if (!countrySelect) return;
  
  countrySelect.innerHTML = '<option value="">All Countries</option>';
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });
}

// Función mejorada para actualizar gráficos
async function updateCharts() {
  if (appState.loading) return;
  
  setLoadingState(true);
  try {
    const country = document.getElementById('countrySelect')?.value || '';
    const metric = document.getElementById('metricSelect')?.value || 'TotalCases';
    const period = document.getElementById('timePeriod')?.value || 'allTime';

    // Determinar qué gráficos actualizar
    const isTotalMetric = ['TotalCases', 'TotalDeaths', 'TotalVaccinations'].includes(metric);

    const requests = [
      CovidAPI.getTimeSeriesData(country, metric, period),
      isTotalMetric ? CovidAPI.getGeoData(metric, period) : Promise.resolve(null),
      CovidAPI.getMortalityRateData(period)
    ];

    const [timeSeriesData, geoData, mortalityData] = await Promise.all(requests);

    // Actualizar gráficos
    if (timeSeriesData?.length) {
      Charts.createTimeSeriesChart('timeSeriesChart', timeSeriesData, metric);
    } else {
      document.querySelector('#timeSeriesChart .chart-container').innerHTML = 
        '<p class="no-data">No time series data available</p>';
    }
    
    if (isTotalMetric) {
      if (geoData?.length) {
        Charts.createGeoChart('geoChart', geoData, metric);
        Charts.createBarChart('barChart', geoData, metric);
        
        // Scatter plot solo para TotalCases vs TotalDeaths
        if (metric === 'TotalCases') {
          const deathsData = await CovidAPI.getGeoData('TotalDeaths', period);
          if (deathsData?.length) {
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
      } else {
        document.querySelector('#geoChart .chart-container').innerHTML = 
          '<p class="no-data">No geographical data available</p>';
        document.querySelector('#barChart .chart-container').innerHTML = 
          '<p class="no-data">No country comparison data available</p>';
      }
    }
    
    if (mortalityData?.length) {
      Charts.createMortalityRateChart('mortalityRateChart', mortalityData);
    } else {
      document.querySelector('#mortalityRateChart .chart-container').innerHTML = 
        '<p class="no-data">No mortality rate data available</p>';
    }

  } catch (error) {
    console.error('Error updating charts:', error);
  } finally {
    setLoadingState(false);
  }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  // Configurar evento de actualización
  const updateButton = document.getElementById('updateCharts');
  if (updateButton) {
    updateButton.addEventListener('click', updateCharts);
  }
  
  // Cargar datos iniciales
  loadInitialData();
  
  // Actualizar automáticamente cada 5 minutos
  setInterval(loadInitialData, 5 * 60 * 1000);
});
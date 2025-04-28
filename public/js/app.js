document.addEventListener('DOMContentLoaded', async () => {
  // Configuración inicial
  const chartManager = new ChartManager();
  const loadingScreen = document.querySelector('.loading-screen');
  const errorBanner = createErrorBanner();
  
  // Elementos del DOM
  const elements = {
    countrySelect: document.getElementById('country-select'),
    metricSelect: document.getElementById('metric-select'),
    dateRangeSelect: document.getElementById('date-range'),
    updateBtn: document.getElementById('update-btn'),
    totalCases: document.getElementById('total-cases'),
    totalDeaths: document.getElementById('total-deaths'),
    totalVaccinations: document.getElementById('total-vaccinations'),
    lastUpdated: document.getElementById('last-updated'),
    chartContexts: {
      timeSeries: document.getElementById('timeSeriesChart').getContext('2d'),
      map: document.getElementById('mapChart').getContext('2d'),
      bar: document.getElementById('barChart').getContext('2d'),
      pie: document.getElementById('pieChart').getContext('2d'),
      scatter: document.getElementById('scatterChart').getContext('2d')
    }
  };

  // Estado de la aplicación
  let appState = {
    isLoading: false,
    selectedCountry: '',
    selectedMetric: 'TotalCases',
    data: {
      countries: [],
      summary: [],
      map: []
    }
  };

  // Inicialización
  initializeApplication();

  // Funciones principales
  function createErrorBanner() {
    const banner = document.createElement('div');
    banner.className = 'error-banner hidden';
    document.body.prepend(banner);
    return banner;
  }

  function showError(message, isRetryable = false) {
    errorBanner.innerHTML = message;
    errorBanner.className = 'error-banner';
    
    if (isRetryable) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'retry-btn';
      retryBtn.textContent = 'Reintentar';
      retryBtn.addEventListener('click', () => {
        errorBanner.classList.add('hidden');
        initializeApplication();
      });
      errorBanner.appendChild(retryBtn);
    }
  }

  function setLoading(loading) {
    appState.isLoading = loading;
    loadingScreen.classList.toggle('hidden', !loading);
  }

  async function initializeApplication() {
    if (appState.isLoading) return;
    
    try {
      setLoading(true);
      errorBanner.classList.add('hidden');

      // Cargar datos en paralelo
      const [countries, summary, mapData] = await Promise.all([
        CovidAPI.getCountries(),
        CovidAPI.getSummaryData(),
        CovidAPI.getMapData()
      ]);

      // Actualizar estado
      appState.data = { countries, summary, mapData };
      
      // Actualizar UI
      updateGlobalSummary();
      populateCountrySelect();
      initializeCharts();
      
      // Actualizar timestamp
      elements.lastUpdated.textContent = new Date().toLocaleString();
      
    } catch (error) {
      console.error('Initialization error:', error);
      showError(error.message, true);
    } finally {
      setLoading(false);
    }
  }

function updateGlobalSummary() {
  const { summary } = appState.data;
  const totals = summary.reduce((acc, item) => ({
    cases: acc.cases + (item.TotalCases || 0),
    deaths: acc.deaths + (item.TotalDeaths || 0),
    vaccinations: acc.vaccinations + (item.TotalVaccinations || 0)
  }), { cases: 0, deaths: 0, vaccinations: 0 });

  elements.totalCases.textContent = totals.cases.toLocaleString();
  elements.totalDeaths.textContent = totals.deaths.toLocaleString();
  elements.totalVaccinations.textContent = totals.vaccinations.toLocaleString();
}

  async function populateCountrySelect() {
    const select = document.getElementById('country-select');
    
    try {
      // Mostrar estado "Cargando..."
      select.innerHTML = '';
      select.disabled = true;
      select.add(new Option('Cargando países...', '', true, true));
      
      // Fetch de países
      const countries = await CovidAPI.getCountries();
      
      // Limpiar y habilitar el dropdown
      select.innerHTML = '';
      select.disabled = false;
      
      // Opción por defecto
      select.add(new Option('Seleccione un país', '', true, false));
      
      // Llenar opciones
      countries.forEach(country => {
        select.add(new Option(country.CountryName, country.CountryCode));
      });
      
      // Event listener
      select.addEventListener('change', handleCountryChange);
      
    } catch (error) {
      // Mostrar error en el dropdown si falla
      select.innerHTML = '';
      select.add(new Option('Error al cargar países', '', true, true));
      select.disabled = true;
      
      console.error('Error loading countries:', error);
      showError('No se pudieron cargar los países. ', true);
    }
  }

  async function handleCountryChange(e) {
    appState.selectedCountry = e.target.value;
    if (!appState.selectedCountry) return;
    
    try {
      setLoading(true);
      const timeSeriesData = await CovidAPI.getTimeSeriesData(appState.selectedCountry);
      chartManager.initTimeSeriesChart(
        elements.chartContexts.timeSeries, 
        timeSeriesData, 
        appState.selectedMetric
      );
    } catch (error) {
      console.error('Error loading country data:', error);
      showError(`Error al cargar datos para ${appState.selectedCountry}`);
    } finally {
      setLoading(false);
    }
  }

  function initializeCharts() {
    try {
      const { summary, mapData } = appState.data;
      
      // Gráfico de mapa
      chartManager.initMapChart(elements.chartContexts.map, mapData);
      
      // Gráfico de barras
      chartManager.initBarChart(
        elements.chartContexts.bar, 
        summary, 
        appState.selectedMetric
      );
      
      // Gráfico de pastel
      chartManager.initPieChart(elements.chartContexts.pie, summary);
      
      // Gráfico de dispersión
      chartManager.initScatterChart(elements.chartContexts.scatter, summary);
      
    } catch (error) {
      console.error('Error initializing charts:', error);
      showError('Error al inicializar gráficos');
    }
  }

  // Event listeners
  elements.metricSelect.addEventListener('change', (e) => {
    appState.selectedMetric = e.target.value;
    chartManager.initBarChart(
      elements.chartContexts.bar, 
      appState.data.summary, 
      appState.selectedMetric
    );
    
    if (appState.selectedCountry) {
      handleCountryChange({ target: { value: appState.selectedCountry } });
    }
  });

  elements.dateRangeSelect.addEventListener('change', async (e) => {
    if (!appState.selectedCountry) return;
    
    const range = e.target.value;
    let startDate = null;
    
    if (range !== 'all') {
      const today = new Date();
      const newDate = new Date(today);
      
      if (range === '1y') newDate.setFullYear(today.getFullYear() - 1);
      if (range === '6m') newDate.setMonth(today.getMonth() - 6);
      if (range === '3m') newDate.setMonth(today.getMonth() - 3);
      
      startDate = newDate.toISOString().split('T')[0];
    }
    
    try {
      setLoading(true);
      const timeSeriesData = await CovidAPI.getTimeSeriesData(
        appState.selectedCountry, 
        startDate
      );
      
      chartManager.initTimeSeriesChart(
        elements.chartContexts.timeSeries, 
        timeSeriesData, 
        appState.selectedMetric
      );
    } catch (error) {
      console.error('Error loading date range:', error);
      showError('Error al cargar rango de fechas');
    } finally {
      setLoading(false);
    }
  });

  elements.updateBtn.addEventListener('click', initializeApplication);
});
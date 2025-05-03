class Charts {
  static margin = { top: 20, right: 30, bottom: 40, left: 50 };
  
  static createTimeSeriesChart(containerId, data, metric) {
    const container = document.querySelector(`#${containerId} .chart-container`);
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }

    // Obtener dimensiones reales del contenedor
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Ajustar márgenes proporcionalmente
    this.margin = { 
      top: 20, 
      right: Math.min(50, width * 0.1), 
      bottom: Math.min(60, height * 0.2), 
      left: Math.min(70, width * 0.15) 
    };
    
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const cleanMetric = metric.replace('_', '');
    data.forEach(d => {
      d.RecordDate = parseDate(d.RecordDate);
      d[cleanMetric] = +d[metric];
    });

    // Set scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.RecordDate))
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[cleanMetric])])
      .nice()
      .range([innerHeight, 0]);

    // Formateadores para ejes
    const formatLargeNumber = d3.format(".2s");
    const formatDate = d3.timeFormat("%b '%y");

    // Create line generator
    const line = d3.line()
      .x(d => x(d.RecordDate))
      .y(d => y(d[cleanMetric]))
      .curve(d3.curveMonotoneX);

    // Configurar eje X con mejor espaciado
    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x)
        .ticks(Math.min(8, Math.floor(width / 80)))
        .tickFormat(formatDate))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    // Configurar eje Y con formato para números grandes
    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y)
        .ticks(Math.min(6, Math.floor(height / 50)))
        .tickFormat(d => d > 1000 ? formatLargeNumber(d) : d))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -this.margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text(cleanMetric.replace(/([A-Z])/g, ' $1'));

    // Add line path
    g.append('path')
      .datum(data)
      .attr('class', 'line')
      .attr('d', line)
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('fill', 'none');

    // Add dots with tooltip
    g.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.RecordDate))
      .attr('cy', d => y(d[cleanMetric]))
      .attr('r', 3)
      .attr('fill', 'steelblue')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 6).attr('fill', 'orange');
        
        d3.select('body').append('div')
          .attr('class', 'tooltip')
          .html(`<strong>${d3.timeFormat('%b %d, %Y')(d.RecordDate)}</strong><br/>
                 ${cleanMetric.replace(/([A-Z])/g, ' $1')}: ${d[cleanMetric].toLocaleString()}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        d3.select('.tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 3).attr('fill', 'steelblue');
        d3.select('.tooltip').remove();
      });
  }

  static createGeoChart(containerId, data, metric) {
    const container = document.querySelector(`#${containerId} .chart-container`);
    if (!container) {
      console.error(`Container not found: #${containerId} .chart-container`);
      return;
    }
    
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No geographical data available</p>';
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Crear un mapa de datos por país para búsqueda rápida
    const dataMap = new Map();
    data.forEach(d => {
      // Normalizar nombres de países para hacer coincidencias más robustas
      const normalizedCountry = d.CountryName.toLowerCase().trim();
      dataMap.set(normalizedCountry, +d.value);
    });

    // Mapeo de nombres alternativos para países problemáticos
    const countryAliases = {
      // América
      'united states': 'united states of america',
      'usa': 'united states of america',
      'us': 'united states of america',
      'united states of america': 'united states of america',
      'united states of america, us': 'united states of america',
      
      // Europa
      'czech republic': 'czechia',
      'czech rep.': 'czechia',
      'bosnia and herzegovina': 'bosnia and herz.',
      'bosnia & herzegovina': 'bosnia and herz.',
      'bosnia': 'bosnia and herz.',
      'macedonia': 'north macedonia',
      'republic of north macedonia': 'north macedonia',
      'vatican city': 'vatican',
      'holy see': 'vatican',
      
      // África
      'democratic republic of congo': 'dem. rep. congo',
      'democratic republic of the congo': 'dem. rep. congo',
      'dr congo': 'dem. rep. congo',
      'congo, dem. rep.': 'dem. rep. congo',
      'congo (kinshasa)': 'dem. rep. congo',
      'republic of the congo': 'congo',
      'congo republic': 'congo',
      'congo (brazzaville)': 'congo',
      'côte d\'ivoire': 'côte d\'ivoire',
      'cote d\'ivoire': 'côte d\'ivoire',
      'ivory coast': 'côte d\'ivoire',
      'eswatini': 'eswatini',
      'swaziland': 'eswatini',
      'cape verde': 'cabo verde',
      
      // Asia
      'myanmar': 'myanmar (burma)',
      'burma': 'myanmar (burma)',
      'south korea': 's. korea',
      'korea, south': 's. korea',
      'korea (south)': 's. korea',
      'republic of korea': 's. korea',
      'north korea': 'n. korea',
      'korea, north': 'n. korea',
      'korea (north)': 'n. korea',
      'democratic people\'s republic of korea': 'n. korea',
      'taiwan': 'taiwan',
      'taiwan*': 'taiwan',
      'taiwan (province of china)': 'taiwan',
      'palestine': 'palestine',
      'palestinian territory': 'palestine',
      'west bank and gaza': 'palestine',
      'syria': 'syria',
      'syrian arab republic': 'syria',
      
      // Oceanía
      'micronesia': 'micronesia (federated states of)'
    };
  
    // Función para encontrar el valor de un país
    const getCountryValue = (countryName) => {
      if (!countryName) return null;
      
      let normalized = countryName.toLowerCase().trim();
      
      // 1. Verificar alias primero
      if (countryAliases[normalized]) {
        normalized = countryAliases[normalized];
        if (dataMap.has(normalized)) {
          return dataMap.get(normalized);
        }
      }
      
      // 2. Intentar coincidencias exactas
      if (dataMap.has(normalized)) {
        return dataMap.get(normalized);
      }
      
      // 3. Intentar coincidencias parciales
      for (const [key, value] of dataMap) {
        const keyNormalized = key.toLowerCase();
        if (normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
          return value;
        }
      }
      
      // 4. Intentar eliminar partes entre paréntesis
      const simplifiedName = normalized.replace(/\(.*\)/, '').trim();
      if (simplifiedName !== normalized && dataMap.has(simplifiedName)) {
        return dataMap.get(simplifiedName);
      }
      
      return null; // No se encontraron datos
    };

    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
      const countries = topojson.feature(world, world.objects.countries).features;

      // Función para encontrar el valor de un país
      const getCountryValue = (countryName) => {
        let normalized = countryName.toLowerCase().trim();
        
        // Verificar alias primero
        if (countryAliases[normalized]) {
          normalized = countryAliases[normalized];
        }
        
        // Buscar coincidencia exacta
        if (dataMap.has(normalized)) {
          return dataMap.get(normalized);
        }
        
        // Buscar coincidencia parcial como fallback
        for (const [key, value] of dataMap) {
          if (normalized.includes(key) || key.includes(normalized)) {
            return value;
          }
        }
        
        return null; // No se encontraron datos
      };

      // Escala de colores mejorada
      const color = d3.scaleThreshold()
        .domain([100, 1000, 10000, 100000, 500000, 1000000, 5000000, 10000000])
        .range(d3.schemeBlues[8]);

      // Dibujar los países
      svg.selectAll('path')
        .data(countries)
        .enter().append('path')
        .attr('d', d3.geoPath().projection(
          d3.geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' })
        ))
        .attr('fill', d => {
          const value = getCountryValue(d.properties.name);
          return value !== null ? color(value) : '#f5f5f5'; // Gris claro para países sin datos
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('stroke', '#000').attr('stroke-width', 1.5);
          
          const value = getCountryValue(d.properties.name);
          const tooltipContent = value !== null ? 
            `${d.properties.name}: ${value.toLocaleString()}` : 
            `${d.properties.name}: No data available`;
            
          d3.select('body').append('div')
            .attr('class', 'tooltip')
            .html(tooltipContent)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
          d3.select('.tooltip')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5);
          d3.select('.tooltip').remove();
        });

      // Leyenda (código de leyenda permanece igual...)
      const legend = svg.append('g')
        .attr('transform', `translate(${width - 150}, ${height - 120})`);

      legend.append('text')
        .attr('x', 0)
        .attr('y', -10)
        .text(metric.replace(/([A-Z])/g, ' $1').trim())
        .style('font-size', '12px')
        .style('font-weight', 'bold');

      legend.selectAll('rect')
        .data(color.range().map((d, i) => {
          const extent = color.invertExtent(d);
          return {
            color: d,
            label: extent[0] ? `${Math.round(extent[0]).toLocaleString()}+` : 'No data'
          };
        }))
        .enter().append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('x', 0)
        .attr('y', (d, i) => i * 15)
        .attr('fill', d => d.color);

      legend.selectAll('text.legend')
        .data(color.range().map((d, i) => {
          const extent = color.invertExtent(d);
          return {
            color: d,
            label: extent[0] ? `${Math.round(extent[0]).toLocaleString()}+` : 'No data'
          };
        }))
        .enter().append('text')
        .attr('class', 'legend')
        .attr('x', 15)
        .attr('y', (d, i) => i * 15 + 9)
        .text(d => d.label)
        .style('font-size', '10px');

    }).catch(err => {
      console.error('Error loading world map:', err);
      container.innerHTML = '<p class="no-data">Error loading map data</p>';
    });
}

  static createMortalityRateChart(containerId, data) {
    const container = document.querySelector(`#${containerId} .chart-container`);
    if (!container) {
      console.error(`Container not found: #${containerId} .chart-container`);
      return;
    }
    
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No mortality rate data available</p>';
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Ajustar márgenes para este gráfico específico
    this.margin = { 
      top: 20, 
      right: Math.min(30, width * 0.1), 
      bottom: Math.min(80, height * 0.2), 
      left: Math.min(60, width * 0.15) 
    };
    
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Filtrar y ordenar datos
    const filteredData = data.filter(d => d.MortalityRate > 0)
      .sort((a, b) => b.MortalityRate - a.MortalityRate)
      .slice(0, 15);

    // Set scales
    const x = d3.scaleBand()
      .domain(filteredData.map(d => d.CountryName))
      .range([0, innerWidth])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => d.MortalityRate)])
      .nice()
      .range([innerHeight, 0]);

    // Configurar eje X
    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", Math.min(12, width / (filteredData.length * 1.5)) + "px");

    // Configurar eje Y
    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y).ticks(5))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -this.margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text('Mortality Rate (%)');

    // Add bars
    g.selectAll('.bar')
      .data(filteredData)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.CountryName))
      .attr('y', d => y(d.MortalityRate))
      .attr('width', x.bandwidth())
      .attr('height', d => innerHeight - y(d.MortalityRate))
      .attr('fill', d => d.MortalityRate > 5 ? '#e74c3c' : '#3498db')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('fill', 'orange');
        
        d3.select('body').append('div')
          .attr('class', 'tooltip')
          .html(`<strong>${d.CountryName}</strong><br/>
                 Mortality Rate: ${d.MortalityRate.toFixed(2)}%<br/>
                 Total Cases: ${d.TotalCases.toLocaleString()}<br/>
                 Total Deaths: ${d.TotalDeaths.toLocaleString()}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        d3.select('.tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill', d => d.MortalityRate > 5 ? '#e74c3c' : '#3498db');
        d3.select('.tooltip').remove();
      });
  }

  static createBarChart(containerId, data, metric) {
    const container = document.querySelector(`#${containerId} .chart-container`);
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Ajustar márgenes para este gráfico
    this.margin = { 
      top: 20, 
      right: Math.min(30, width * 0.1), 
      bottom: Math.min(80, height * 0.2), 
      left: Math.min(70, width * 0.15) 
    };
    
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Sort data and take top 10
    const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 10);

    // Configurar formato para números grandes
    const formatLargeNumber = d3.format(".2s");
    const maxLabelLength = d3.max(sortedData, d => d.CountryName.length);
    const barPadding = maxLabelLength > 10 ? 0.2 : 0.1;

    // Set scales con padding ajustable
    const x = d3.scaleBand()
      .domain(sortedData.map(d => d.CountryName))
      .range([0, innerWidth])
      .padding(barPadding);

    const y = d3.scaleLinear()
      .domain([0, d3.max(sortedData, d => d.value)])
      .nice()
      .range([innerHeight, 0]);

    // Configurar eje X
    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", Math.min(12, width / (sortedData.length * 1.5)) + "px");

    // Configurar eje Y con formato para números grandes
    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y)
        .ticks(Math.min(5, Math.floor(height / 40)))
        .tickFormat(d => d > 1000 ? formatLargeNumber(d) : d))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -this.margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text(metric.replace(/([A-Z])/g, ' $1'));

    // Add bars
    g.selectAll('.bar')
      .data(sortedData)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.CountryName))
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => innerHeight - y(d.value))
      .attr('fill', 'steelblue')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('fill', 'orange');
        
        d3.select('body').append('div')
          .attr('class', 'tooltip')
          .html(`<strong>${d.CountryName}</strong><br/>${metric.replace(/([A-Z])/g, ' $1')}: ${d.value.toLocaleString()}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        d3.select('.tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill', 'steelblue');
        d3.select('.tooltip').remove();
      });
  }

  static createScatterPlot(containerId, data) {
    const container = document.querySelector(`#${containerId} .chart-container`);
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Ajustar márgenes para este gráfico
    this.margin = { 
      top: 20, 
      right: Math.min(50, width * 0.1), 
      bottom: Math.min(60, height * 0.15), 
      left: Math.min(70, width * 0.15) 
    };
    
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Filter data with valid values
    const plotData = data.filter(d => d.value > 0 && d.TotalDeaths > 0);

    // Configurar formato para números grandes
    const formatLargeNumber = d3.format(".2s");
    const tickValues = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8];

    // Set scales (logarithmic)
    const x = d3.scaleLog()
      .domain(d3.extent(plotData, d => d.value))
      .nice()
      .range([0, innerWidth]);

    const y = d3.scaleLog()
      .domain(d3.extent(plotData, d => d.TotalDeaths))
      .nice()
      .range([innerHeight, 0]);

    // Configurar eje X
    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x)
        .tickValues(tickValues)
        .tickFormat(formatLargeNumber))
      .append('text')
      .attr('fill', '#000')
      .attr('x', innerWidth / 2)
      .attr('y', this.margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .text('Total Cases (log scale)');

    // Configurar eje Y
    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y)
        .tickValues(tickValues)
        .tickFormat(formatLargeNumber))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -this.margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text('Total Deaths (log scale)');

    // Add dots
    g.selectAll('.dot')
      .data(plotData)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.value))
      .attr('cy', d => y(d.TotalDeaths))
      .attr('r', 5)
      .attr('fill', 'steelblue')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 8).attr('fill', 'orange');
        
        d3.select('body').append('div')
          .attr('class', 'tooltip')
          .html(`<strong>${d.CountryName}</strong><br/>
                 Cases: ${d.value.toLocaleString()}<br/>
                 Deaths: ${d.TotalDeaths.toLocaleString()}<br/>
                 Death Rate: ${(d.TotalDeaths / d.value * 100).toFixed(2)}%`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        d3.select('.tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 5).attr('fill', 'steelblue');
        d3.select('.tooltip').remove();
      });
  }

  static handleResize() {
    const charts = [
      'timeSeriesChart',
      'geoChart',
      'barChart',
      'mortalityRateChart',
      'scatterPlot'
    ];
    
    charts.forEach(chartId => {
      const container = document.querySelector(`#${chartId} .chart-container`);
      if (container && container.firstChild) {
        container.innerHTML = '';
      }
    });
  }
}

// Inicializar el listener de redimensionamiento
window.addEventListener('resize', () => {
  if (typeof Charts.handleResize === 'function') {
    Charts.handleResize();
  }
});
class Charts {
  static margin = { top: 20, right: 30, bottom: 40, left: 50 };
  
  static createTimeSeriesChart(containerId, data, metric) {
    const container = document.querySelector(`#${containerId} .chart-container`);
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }
  
    // Asegurar que los datos estén ordenados por fecha
    data.sort((a, b) => new Date(a.RecordDate) - new Date(b.RecordDate));
  
    // Para métricas de totales, asegurar que no decrezcan
    if (['TotalCases', 'TotalDeaths', 'TotalVaccinations'].includes(metric)) {
      let maxValue = 0;
      data = data.map(d => {
        const currentValue = d[metric] || 0;
        maxValue = Math.max(maxValue, currentValue);
        return {
          ...d,
          [metric]: maxValue
        };
      });
    }
  
    // Obtener dimensiones reales del contenedor
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Ajustar márgenes proporcionalmente
    const margin = { 
      top: 20, 
      right: Math.min(50, width * 0.1), 
      bottom: Math.min(60, height * 0.2), 
      left: Math.min(70, width * 0.15) 
    };
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
  
    // Crear SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
  
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
  
    // Parse dates and clean metric name
    const parseDate = d3.timeParse('%Y-%m-%d');
    const cleanMetric = metric.replace('_', '');
    data.forEach(d => {
      d.RecordDate = parseDate(d.RecordDate);
      d[cleanMetric] = +d[metric];
    });
  
    // Set scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.RecordDate))
      .range([0, innerWidth])
      .nice();
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[cleanMetric]) * 1.05]) // +5% para espacio arriba
      .range([innerHeight, 0])
      .nice();
  
    // Formateadores para ejes
    const formatLargeNumber = d3.format(".2s");
    const formatDate = d3.timeFormat("%b '%y");
  
    // Create line generator
    const line = d3.line()
      .x(d => x(d.RecordDate))
      .y(d => y(d[cleanMetric]))
      .curve(d3.curveMonotoneX);
  
    // Configurar eje X
    const xAxis = g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x)
        .ticks(Math.min(8, Math.floor(width / 80)))
        .tickFormat(formatDate));
  
    // Rotar etiquetas del eje X si es necesario
    xAxis.selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
  
    // Configurar eje Y
    const yAxis = g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y)
        .ticks(Math.min(6, Math.floor(height / 50)))
        .tickFormat(d => d > 1000 ? formatLargeNumber(d) : d));
  
    // Etiqueta del eje Y
    yAxis.append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text(cleanMetric.replace(/([A-Z])/g, ' $1').trim());
  
    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .ticks(Math.min(6, Math.floor(height / 50)))
        .tickSize(-innerWidth)
        .tickFormat(''))
      .selectAll('.tick line')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2');
  
    // Add line path
    g.append('path')
      .datum(data)
      .attr('class', 'line')
      .attr('d', line)
      .attr('stroke', '#3498db')
      .attr('stroke-width', 2)
      .attr('fill', 'none');
  
    // Add area under line for better visual perception
    const area = d3.area()
      .x(d => x(d.RecordDate))
      .y0(innerHeight)
      .y1(d => y(d[cleanMetric]))
      .curve(d3.curveMonotoneX);
  
    g.append('path')
      .datum(data)
      .attr('class', 'area')
      .attr('d', area)
      .attr('fill', 'rgba(52, 152, 219, 0.2)')
      .attr('stroke', 'none');
  
    // Add dots with tooltip
    const dots = g.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.RecordDate))
      .attr('cy', d => y(d[cleanMetric]))
      .attr('r', 3)
      .attr('fill', '#3498db');
  
    // Tooltip behavior
    dots.on('mouseover', function(event, d) {
      d3.select(this)
        .attr('r', 6)
        .attr('fill', '#e74c3c');
      
      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .html(`
          <strong>${d3.timeFormat('%b %d, %Y')(d.RecordDate)}</strong><br/>
          ${cleanMetric.replace(/([A-Z])/g, ' $1')}: ${d[cleanMetric].toLocaleString()}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('r', 3)
        .attr('fill', '#3498db');
      d3.select('.tooltip').remove();
    });
  
    // Responsive behavior
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        
        // Update SVG dimensions
        svg
          .attr('width', newWidth)
          .attr('height', newHeight);
        
        // Update scales
        x.range([0, newWidth - margin.left - margin.right]);
        y.range([newHeight - margin.top - margin.bottom, 0]);
        
        // Update axes
        xAxis.call(d3.axisBottom(x).ticks(Math.min(8, Math.floor(newWidth / 80))));
        yAxis.call(d3.axisLeft(y).ticks(Math.min(6, Math.floor(newHeight / 50))));
        
        // Update line and area
        svg.select('.line').attr('d', line);
        svg.select('.area').attr('d', area);
        
        // Update dots position
        dots
          .attr('cx', d => x(d.RecordDate))
          .attr('cy', d => y(d[cleanMetric]));
      }
    });
  
    resizeObserver.observe(container);
  }

    static createTimeSeriesChart(containerId, data, metric) {
      const container = document.querySelector(`#${containerId} .chart-container`);
      container.innerHTML = '';
      
      if (!data || data.length === 0) {
        container.innerHTML = '<p class="no-data">No data available</p>';
        return;
      }
  
      const width = container.clientWidth;
      const height = container.clientHeight;
      
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
  
      const parseDate = d3.timeParse('%Y-%m-%d');
      const cleanMetric = metric.replace('_', '');
      data.forEach(d => {
        d.RecordDate = parseDate(d.RecordDate);
        d[cleanMetric] = +d[metric];
      });
  
      const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.RecordDate))
        .range([0, innerWidth]);
  
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[cleanMetric])])
        .nice()
        .range([innerHeight, 0]);
  
      const formatLargeNumber = d3.format(".2s");
      const formatDate = d3.timeFormat("%b '%y");
  
      const line = d3.line()
        .x(d => x(d.RecordDate))
        .y(d => y(d[cleanMetric]))
        .curve(d3.curveMonotoneX);
  
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
  
      g.append('path')
        .datum(data)
        .attr('class', 'line')
        .attr('d', line)
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('fill', 'none');
  
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
  
      // Normalización de nombres
      const normalizeName = (name) => {
        return name.toLowerCase()
          .replace(/[^a-z\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };
  
      // Mapeo de datos
      const dataMap = new Map();
      data.forEach(d => {
        const normalized = normalizeName(d.CountryName);
        dataMap.set(normalized, +d[metric] || +d.value || 0);
      });
  
      // Mapeo especial para países problemáticos
      const specialMappings = {
        'cote divoire': { 
          mapKey: 'cote divoire',
          displayName: "Côte d'Ivoire",
          topoName: "côte d'ivoire"
        },
        'bosnia and herzegovina': {
          mapKey: 'bosnia and herzegovina',
          displayName: "Bosnia and Herzegovina",
          topoName: "bosnia and herz"
        },
        'democratic republic of congo': {
          mapKey: 'democratic republic of congo',
          displayName: "DR Congo",
          topoName: "dem. rep. congo"
        },
        'dr congo': {
          mapKey: 'democratic republic of congo',
          displayName: "DR Congo",
          topoName: "dem. rep. congo"
        }
      };
  
      // Función de búsqueda mejorada
      const getCountryData = (topoName) => {
        const normalizedTopo = normalizeName(topoName);
        
        // 1. Buscar en mapeos especiales
        for (const [key, mapping] of Object.entries(specialMappings)) {
          if (normalizedTopo.includes(mapping.topoName)) {
            return {
              value: dataMap.get(mapping.mapKey),
              displayName: mapping.displayName
            };
          }
        }
        
        // 2. Búsqueda normal
        for (const [dataName, value] of dataMap) {
          if (normalizedTopo.includes(dataName) || dataName.includes(normalizedTopo)) {
            return {
              value: value,
              displayName: topoName // Usar el nombre original del mapa
            };
          }
        }
        
        console.log(`No match for: ${topoName} (normalized: ${normalizedTopo})`);
        return {
          value: null,
          displayName: topoName
        };
      };
  
      d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
        const countries = topojson.feature(world, world.objects.countries).features;
  
        // Escala de colores
        const maxValue = d3.max(Array.from(dataMap.values()));
        const color = d3.scaleThreshold()
          .domain([100, 1000, 10000, 100000, 1000000, 10000000])
          .range(d3.schemeBlues[7]);
  
        // Proyección
        const projection = d3.geoNaturalEarth1()
          .fitSize([width, height], { type: 'Sphere' });
  
        // Dibujar países
        svg.selectAll('path')
          .data(countries)
          .enter().append('path')
          .attr('d', d3.geoPath().projection(projection))
          .attr('fill', d => {
            const countryData = getCountryData(d.properties.name);
            return countryData.value !== null ? color(countryData.value) : '#f5f5f5';
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke', '#000').attr('stroke-width', 1.5);
            
            const countryData = getCountryData(d.properties.name);
            const tooltipContent = countryData.value !== null ? 
              `<strong>${countryData.displayName}</strong><br/>${metric}: ${countryData.value.toLocaleString()}` : 
              `<strong>${countryData.displayName}</strong><br/>No data available`;
              
            d3.select('body').append('div')
              .attr('class', 'tooltip')
              .html(tooltipContent)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5);
            d3.select('.tooltip').remove();
          });
  
        // Leyenda
        const legend = svg.append('g')
          .attr('transform', `translate(${width - 180}, ${height - 150})`);
  
        legend.append('text')
          .attr('x', 0)
          .attr('y', -10)
          .text(metric.replace(/([A-Z])/g, ' $1').trim())
          .style('font-size', '12px')
          .style('font-weight', 'bold');
  
        const legendItems = color.range().map((d, i) => {
          const extent = color.invertExtent(d);
          return {
            color: d,
            label: extent[0] ? 
              `${extent[0].toLocaleString()}${extent[1] ? `-${extent[1].toLocaleString()}` : '+'}` : 
              'No data'
          };
        });
  
        legend.selectAll('rect')
          .data(legendItems)
          .enter().append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('x', 0)
          .attr('y', (d, i) => i * 15)
          .attr('fill', d => d.color);
  
        legend.selectAll('text.legend')
          .data(legendItems)
          .enter().append('text')
          .attr('class', 'legend')
          .attr('x', 15)
          .attr('y', (d, i) => i * 15 + 10)
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
class Charts {
  static margin = { top: 20, right: 30, bottom: 40, left: 50 };
  
  static createTimeSeriesChart(containerId, data, metric) {
    const container = document.querySelector(`#${containerId} .chart-container`);
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
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
      d[cleanMetric] = +d[metric]; // Usamos el nombre original de la métrica
    });

    // Set scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.RecordDate))
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[cleanMetric])])
      .nice()
      .range([innerHeight, 0]);

    // Create line generator
    const line = d3.line()
      .x(d => x(d.RecordDate))
      .y(d => y(d[cleanMetric]))
      .curve(d3.curveMonotoneX);

    // Add axes
    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%b %Y')));

    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text(cleanMetric.replace(/([A-Z])/g, ' $1')); // Formatea NewCases como "New Cases"

    // Add line path
    g.append('path')
      .datum(data)
      .attr('class', 'line')
      .attr('d', line)
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('fill', 'none');

    // Add tooltip
    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

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
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`<strong>${d3.timeFormat('%b %d, %Y')(d.RecordDate)}</strong><br/>${cleanMetric.replace(/([A-Z])/g, ' $1')}: ${d[cleanMetric]}`)
          .style('left', (event.pageX + 5) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });
  }

  static createGeoChart(containerId, data, metric) {
    const container = document.querySelector(`#${containerId} .chart-container`);
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const projection = d3.geoNaturalEarth1()
      .fitSize([width, height], { type: 'Sphere' });

    const path = d3.geoPath().projection(projection);

    // Create a color scale
    const color = d3.scaleThreshold()
      .domain([1000, 10000, 100000, 500000, 1000000, 5000000, 10000000, 50000000])
      .range(d3.schemeBlues[8]);

    // Load world map data
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
      const countries = topojson.feature(world, world.objects.countries).features;

      // Create a map from our data for quick lookup
      const dataMap = {};
      data.forEach(d => {
        dataMap[d.CountryName] = +d.value;
      });

      // Draw the countries
      svg.selectAll('path')
        .data(countries)
        .enter().append('path')
        .attr('d', path)
        .attr('fill', d => {
          const value = dataMap[d.properties.name];
          return value ? color(value) : '#ccc';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .append('title')
        .text(d => {
          const value = dataMap[d.properties.name];
          return `${d.properties.name}: ${value ? value.toLocaleString() : 'No data'}`;
        });

      // Add legend
      const legend = svg.append('g')
        .attr('transform', `translate(${width - 100}, ${height - 120})`);

      legend.selectAll('rect')
        .data(color.range().map(d => {
          const range = color.invertExtent(d);
          return {
            color: d,
            label: range[0] ? `${range[0].toLocaleString()}` : 'No data'
          };
        }))
        .enter().append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('x', 0)
        .attr('y', (d, i) => i * 15)
        .attr('fill', d => d.color);

      legend.selectAll('text')
        .data(color.range().map(d => {
          const range = color.invertExtent(d);
          return {
            color: d,
            label: range[0] ? `${range[0].toLocaleString()}` : 'No data'
          };
        }))
        .enter().append('text')
        .attr('x', 15)
        .attr('y', (d, i) => i * 15 + 9)
        .text(d => d.label)
        .style('font-size', '10px');
    });
  }

  static createMortalityRateChart(containerId, data) {
    const container = document.querySelector(`#${containerId} .chart-container`);
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
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
      .slice(0, 15); // Top 15 países

    // Set scales
    const x = d3.scaleBand()
      .domain(filteredData.map(d => d.CountryName))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => d.MortalityRate)])
      .nice()
      .range([innerHeight, 0]);

    // Add axes
    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');

    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
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
      .attr('fill', d => d.MortalityRate > 5 ? '#e74c3c' : '#3498db') // Rojo para tasas altas
      .on('mouseover', function(event, d) {
        d3.select(this).attr('fill', 'orange');
        
        const tooltip = d3.select(container)
          .append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0)
          .html(`<strong>${d.CountryName}</strong><br/>
                 Mortality Rate: ${d.MortalityRate.toFixed(2)}%<br/>
                 Total Cases: ${d.TotalCases.toLocaleString()}<br/>
                 Total Deaths: ${d.TotalDeaths.toLocaleString()}`)
          .style('left', (event.pageX + 5) + 'px')
          .style('top', (event.pageY - 28) + 'px');

        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill', d => d.MortalityRate > 5 ? '#e74c3c' : '#3498db');
        d3.select(container).select('.tooltip').remove();
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

    // Set scales
    const x = d3.scaleBand()
      .domain(sortedData.map(d => d.CountryName))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(sortedData, d => d.value)])
      .nice()
      .range([innerHeight, 0]);

    // Add axes
    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');

    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text(metric.replace(/([A-Z])/g, ' $1')); // Formatea TotalCases como "Total Cases"

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
        
        const tooltip = d3.select(container)
          .append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0)
          .html(`<strong>${d.CountryName}</strong><br/>${metric.replace(/([A-Z])/g, ' $1')}: ${d.value.toLocaleString()}`)
          .style('left', (event.pageX + 5) + 'px')
          .style('top', (event.pageY - 28) + 'px');

        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill', 'steelblue');
        d3.select(container).select('.tooltip').remove();
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

    // Set scales (logarithmic)
    const x = d3.scaleLog()
      .domain(d3.extent(plotData, d => d.value))
      .nice()
      .range([0, innerWidth]);

    const y = d3.scaleLog()
      .domain(d3.extent(plotData, d => d.TotalDeaths))
      .nice()
      .range([innerHeight, 0]);

    // Add axes
    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('.1s')))
      .append('text')
      .attr('fill', '#000')
      .attr('x', innerWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .text('Total Cases (log scale)');

    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y).tickFormat(d3.format('.1s')))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
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
        
        const tooltip = d3.select(container)
          .append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0)
          .html(`<strong>${d.CountryName}</strong><br/>
                 Cases: ${d.value.toLocaleString()}<br/>
                 Deaths: ${d.TotalDeaths.toLocaleString()}<br/>
                 Death Rate: ${(d.TotalDeaths / d.value * 100).toFixed(2)}%`)
          .style('left', (event.pageX + 5) + 'px')
          .style('top', (event.pageY - 28) + 'px');

        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 5).attr('fill', 'steelblue');
        d3.select(container).select('.tooltip').remove();
      });
  }
}
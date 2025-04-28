class ChartManager {
  constructor() {
    
    this.chartInstances = {};
    this.colorPalette = {
      cases: {
        base: 'rgba(243, 156, 18, 1)',
        light: 'rgba(243, 156, 18, 0.2)'
      },
      deaths: {
        base: 'rgba(231, 76, 60, 1)',
        light: 'rgba(231, 76, 60, 0.2)'
      },
      vaccinations: {
        base: 'rgba(46, 204, 113, 1)',
        light: 'rgba(46, 204, 113, 0.2)'
      },
      default: {
        base: 'rgba(52, 152, 219, 1)',
        light: 'rgba(52, 152, 219, 0.2)'
      }
    };
  }
  

  // Destruye TODOS los gráficos existentes
  destroyAllCharts() {
    Object.keys(this.chartInstances).forEach(chartId => {
      if (this.chartInstances[chartId]) {
        this.chartInstances[chartId].destroy();
      }
    });
    this.chartInstances = {}; // Resetear el objeto
  }

  // Método genérico para inicializar cualquier gráfico
  initChart({ id, type, ctx, data, labels, backgroundColor, options = {} }) {
    this._destroyChartIfExists(id);
    
    this.chartInstances[id] = new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [{ data, backgroundColor }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options
      }
    });
  }

  // Métodos auxiliares
  _destroyChartIfExists(chartId) {
    if (this.chartInstances[chartId]) {
      this.chartInstances[chartId].destroy();
      delete this.chartInstances[chartId];
    }
  }

  _showErrorMessage(ctx, message = 'No hay datos disponibles') {
    ctx.save();
    ctx.font = '16px "Roboto", sans-serif';
    ctx.fillStyle = '#95a5a6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.restore();
  }

  _getColorForMetric(metric) {
    const colorMap = {
      'TotalCases': this.colorPalette.cases,
      'NewCases': this.colorPalette.cases,
      'TotalDeaths': this.colorPalette.deaths,
      'NewDeaths': this.colorPalette.deaths,
      'TotalVaccinations': this.colorPalette.vaccinations,
      'CasesPerThousand': this.colorPalette.cases
    };
    return colorMap[metric] || this.colorPalette.default;
  }

  _getLabelForMetric(metric) {
    const labels = {
      'TotalCases': 'Casos Totales',
      'NewCases': 'Nuevos Casos',
      'TotalDeaths': 'Muertes Totales',
      'NewDeaths': 'Nuevas Muertes',
      'TotalVaccinations': 'Vacunaciones Totales',
      'CasesPerThousand': 'Casos por 1000 hab.'
    };
    return labels[metric] || metric;
  }

  _formatTooltipValue(value) {
    return Number(value).toLocaleString();
  }

  // Métodos principales de gráficos
initTimeSeriesChart(ctx, data, metric = 'TotalCases') {
  this._destroyChartIfExists('timeSeriesChart');

  // Validación robusta de datos
  if (!ctx || !ctx.canvas) {
    console.error('Contexto de canvas no válido');
    return;
  }

  if (!data || !Array.isArray(data)) {
    this._showErrorMessage(ctx, 'Datos no válidos');
    console.error('Datos recibidos:', data);
    return;
  }

  if (data.error) {
    this._showErrorMessage(ctx, data.error);
    return;
  }

  if (data.length === 0) {
    this._showErrorMessage(ctx, 'No hay datos disponibles');
    return;
  }

  try {
    const colors = this._getColorForMetric(metric);
    const chartData = {
      labels: data.map(item => item.date),
      datasets: [{
        label: this._getLabelForMetric(metric),
        data: data.map(item => item[metric] || 0),
        borderColor: colors.base,
        backgroundColor: colors.light,
        borderWidth: 2,
        fill: true,
        tension: 0.1
      }]
    };

    this.chartInstances.timeSeriesChart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = data[context.dataIndex];
                return [
                  `${context.dataset.label}: ${item[metric].toLocaleString()}`,
                  `Fecha: ${item.date}`,
                  `Total muertes: ${item.TotalDeaths?.toLocaleString() || 'N/A'}`,
                  `Vacunaciones: ${item.TotalVaccinations?.toLocaleString() || 'N/A'}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45 }
          },
          y: {
            beginAtZero: false,
            ticks: { callback: value => value.toLocaleString() }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error al crear gráfico:', error);
    this._showErrorMessage(ctx, 'Error al procesar datos');
  }
}

  initBarChart(ctx, data, metric = 'TotalCases') {
    this._destroyChartIfExists('barChart');

    if (!data || data.length === 0) {
      this._showErrorMessage(ctx);
      return;
    }

    try {
      const colors = this._getColorForMetric(metric);
      const sortedData = [...data]
        .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
        .slice(0, 10);

      this.chartInstances.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sortedData.map(item => item.CountryName),
          datasets: [{
            label: this._getLabelForMetric(metric),
            data: sortedData.map(item => item[metric]),
            backgroundColor: colors.base,
            borderColor: colors.base,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `${context.dataset.label}: ${this._formatTooltipValue(context.raw)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 12
                }
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => this._formatTooltipValue(value),
                font: {
                  size: 12
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error creating bar chart:', error);
      this._showErrorMessage(ctx, 'Error al crear gráfico');
    }
  }

  initPieChart(ctx, data) {
    this._destroyChartIfExists('pieChart');

    if (!data || data.length === 0) {
      this._showErrorMessage(ctx);
      return;
    }

    try {
      // Agrupar datos por continente
      const continentData = data.reduce((acc, item) => {
        if (!item.Continent) return acc;
        acc[item.Continent] = (acc[item.Continent] || 0) + (item.TotalCases || 0);
        return acc;
      }, {});

      const continents = Object.keys(continentData).filter(cont => continentData[cont] > 0);

      if (continents.length === 0) {
        this._showErrorMessage(ctx);
        return;
      }

      this.chartInstances.pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: continents,
          datasets: [{
            data: continents.map(cont => continentData[cont]),
            backgroundColor: [
              'rgba(52, 152, 219, 0.7)',
              'rgba(155, 89, 182, 0.7)',
              'rgba(26, 188, 156, 0.7)',
              'rgba(241, 196, 15, 0.7)',
              'rgba(230, 126, 34, 0.7)',
              'rgba(231, 76, 60, 0.7)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const value = context.raw;
                  const percentage = Math.round((value / total) * 100);
                  return `${context.label}: ${this._formatTooltipValue(value)} (${percentage}%)`;
                }
              }
            }
          },
          animation: {
            animateScale: true,
            animateRotate: true
          }
        }
      });
    } catch (error) {
      console.error('Error creating pie chart:', error);
      this._showErrorMessage(ctx, 'Error al crear gráfico');
    }
  }

  initScatterChart(ctx, data) {
    this._destroyChartIfExists('scatterChart');

    if (!data || data.length === 0) {
      this._showErrorMessage(ctx);
      return;
    }

    try {
      // Filtrar datos con valores válidos
      const validData = data.filter(
        item => item.TotalCases > 0 && item.TotalDeaths > 0 && item.Population
      );

      if (validData.length === 0) {
        this._showErrorMessage(ctx, 'No hay datos suficientes');
        return;
      }

      this.chartInstances.scatterChart = new Chart(ctx, {
        type: 'bubble',
        data: {
          datasets: [{
            label: 'Casos vs Muertes',
            data: validData.map(item => ({
              x: item.TotalCases,
              y: item.TotalDeaths,
              r: Math.sqrt(item.Population) / 1000
            })),
            backgroundColor: 'rgba(52, 152, 219, 0.7)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  const item = validData[context.dataIndex];
                  return [
                    `País: ${item.CountryName}`,
                    `Población: ${this._formatTooltipValue(item.Population)}`,
                    `Casos: ${this._formatTooltipValue(item.TotalCases)}`,
                    `Muertes: ${this._formatTooltipValue(item.TotalDeaths)}`,
                    `Mortalidad: ${(item.TotalDeaths / item.TotalCases * 100).toFixed(2)}%`
                  ];
                }
              }
            }
          },
          scales: {
            x: {
              type: 'logarithmic',
              title: {
                display: true,
                text: 'Casos totales (log)',
                font: {
                  weight: 'bold',
                  size: 14
                }
              },
              ticks: {
                callback: (value) => this._formatTooltipValue(value)
              }
            },
            y: {
              type: 'logarithmic',
              title: {
                display: true,
                text: 'Muertes totales (log)',
                font: {
                  weight: 'bold',
                  size: 14
                }
              },
              ticks: {
                callback: (value) => this._formatTooltipValue(value)
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error creating scatter chart:', error);
      this._showErrorMessage(ctx, 'Error al crear gráfico');
    }
  }

  initMapChart(ctx, data) {
    this._destroyChartIfExists('mapChart');

    if (!data || data.length === 0) {
      this._showErrorMessage(ctx, 'No hay datos geográficos');
      return;
    }

    try {
      // Verificar si el plugin ChartGeo está disponible
      if (typeof ChartGeo === 'undefined') {
        throw new Error('ChartGeo plugin no está cargado');
      }

      // Configurar datos para el mapa
      const mapData = {
        labels: data.map(item => item.CountryCode),
        datasets: [{
          label: 'Casos por país',
          data: data.map(item => ({
            feature: item.CountryCode,
            value: item.TotalCases
          })),
          backgroundColor: context => {
            const value = context.dataset.data[context.dataIndex].value;
            const max = Math.max(...data.map(item => item.TotalCases));
            const ratio = value / max;
            return `rgba(231, 76, 60, ${0.2 + ratio * 0.8})`;
          }
        }]
      };

      this.chartInstances.mapChart = new Chart(ctx, {
        type: 'choropleth',
        data: mapData,
        options: {
          showOutline: true,
          showGraticule: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const country = data.find(item => item.CountryCode === context.label);
                  if (!country) return context.label;
                  
                  return [
                    `País: ${country.CountryName}`,
                    `Población: ${this._formatTooltipValue(country.Population)}`,
                    `Casos: ${this._formatTooltipValue(country.TotalCases)}`,
                    `Muertes: ${this._formatTooltipValue(country.TotalDeaths)}`,
                    `Vacunas: ${country.TotalVaccinations ? this._formatTooltipValue(country.TotalVaccinations) : 'N/A'}`
                  ];
                }
              }
            }
          },
          scales: {
            xy: {
              projection: 'equalEarth'
            }
          }
        }
      });
    } catch (error) {
      console.error('Error creating map chart:', error);
      this._showErrorMessage(ctx, 'Error al crear mapa. Cargue el plugin ChartGeo');
    }
  }

  // Método para actualizar todos los gráficos
  updateAllCharts(chartContexts, summaryData, mapData, selectedMetric) {
    if (chartContexts.timeSeries && this.chartInstances.timeSeriesChart) {
      this.initTimeSeriesChart(
        chartContexts.timeSeries, 
        summaryData, 
        selectedMetric
      );
    }
    
    if (chartContexts.bar) {
      this.initBarChart(chartContexts.bar, summaryData, selectedMetric);
    }
    
    if (chartContexts.pie) {
      this.initPieChart(chartContexts.pie, summaryData);
    }
    
    if (chartContexts.scatter) {
      this.initScatterChart(chartContexts.scatter, summaryData);
    }
    
    if (chartContexts.map) {
      this.initMapChart(chartContexts.map, mapData);
    }
  }

  // Método para limpiar todos los gráficos
  destroyAllCharts() {
    Object.keys(this.chartInstances).forEach(chartId => {
      this._destroyChartIfExists(chartId);
    });
  }
}
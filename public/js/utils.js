export class FormatUtils {
    static formatNumber(value) {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value !== 'number') value = Number(value);
      if (isNaN(value)) return 'N/A';
      
      return new Intl.NumberFormat('es-ES', {
        maximumFractionDigits: 2
      }).format(value);
    }
  
    static formatLargeNumber(value) {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value !== 'number') value = Number(value);
      if (isNaN(value)) return 'N/A';
      
      if (value >= 1000000000) {
        return (value / 1000000000).toFixed(2) + 'B';
      }
      if (value >= 1000000) {
        return (value / 1000000).toFixed(2) + 'M';
      }
      if (value >= 1000) {
        return (value / 1000).toFixed(2) + 'K';
      }
      return value.toString();
    }
  
    static formatDate(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('es-ES');
    }
  }
INSERT INTO dbo.Countries (CountryCode, CountryName, Continent, Population, LifeExpectancy, GDPPerCapita)
SELECT DISTINCT
    LEFT(iso_code, 10) AS CountryCode,
    location AS CountryName,
    continent AS Continent,
    TRY_CAST(population AS BIGINT) AS Population,
    TRY_CAST(life_expectancy AS DECIMAL(5,2)) AS LifeExpectancy,
    TRY_CAST(gdp_per_capita AS DECIMAL(20,6)) AS GDPPerCapita
FROM dbo.[owid-covid-data]
WHERE LEFT(iso_code, 10) NOT IN (SELECT CountryCode FROM dbo.Countries)
  AND iso_code IS NOT NULL
  AND location IS NOT NULL;


INSERT INTO dbo.CovidData (
    CountryCode, 
    RecordDate, 
    TotalCases, 
    NewCases, 
    TotalDeaths, 
    NewDeaths, 
    TotalVaccinations
)
SELECT 
    LEFT(iso_code, 3) AS CountryCode,
    CASE 
        WHEN ISDATE(date) = 1 THEN CAST(date AS DATE)
        ELSE NULL 
    END AS RecordDate,
    TRY_CAST(total_cases AS BIGINT) AS TotalCases,
    TRY_CAST(new_cases AS INT) AS NewCases,
    TRY_CAST(total_deaths AS INT) AS TotalDeaths,
    TRY_CAST(new_deaths AS INT) AS NewDeaths,
    TRY_CAST(total_vaccinations AS BIGINT) AS TotalVaccinations
FROM dbo.[owid-covid-data]
WHERE LEFT(iso_code, 3) IN (SELECT CountryCode FROM dbo.Countries)
  AND date IS NOT NULL;
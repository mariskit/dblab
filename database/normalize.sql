INSERT INTO dbo.Countries (
    CountryCode, 
    CountryName, 
    Continent, 
    Population, 
    LifeExpectancy, 
    GDPPerCapita
)
SELECT DISTINCT
    LEFT(Countrycode, 3) AS CountryCode,  -- ⚠️ debe ser 3 letras, no 10
    Countryname AS CountryName,
    continent AS Continent,
    TRY_CAST(population AS BIGINT) AS Population,
    TRY_CAST(life_expectancy AS DECIMAL(5,2)) AS LifeExpectancy,
    TRY_CAST(gdp_per_capita AS DECIMAL(20,6)) AS GDPPerCapita
FROM dbo.[owid-covid-data]
WHERE 
    Countrycode IS NOT NULL
    AND LEN(Countrycode) = 3  -- evita códigos no estándar como "OWID_WRL"
    AND Countryname IS NOT NULL
    AND LEFT(Countrycode, 3) NOT IN (SELECT CountryCode FROM dbo.Countries);


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
    LEFT(CountryCode, 3) AS CountryCode,
    CAST(date AS DATE) AS RecordDate,
    TRY_CAST(total_cases AS BIGINT) AS TotalCases,
    TRY_CAST(new_cases AS INT) AS NewCases,
    TRY_CAST(total_deaths AS INT) AS TotalDeaths,
    TRY_CAST(new_deaths AS INT) AS NewDeaths,
    TRY_CAST(total_vaccinations AS BIGINT) AS TotalVaccinations
FROM dbo.[owid-covid-data]
WHERE 
    ISDATE(date) = 1
    AND LEN(CountryCode) = 3
    AND LEFT(CountryCode, 3) IN (SELECT CountryCode FROM dbo.Countries);

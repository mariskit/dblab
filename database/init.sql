CREATE DATABASE covid_dashboard_db;
go

USE covid_dashboard_db;
go 

-- Crear la tabla Countries
CREATE TABLE dbo.Countries (
    CountryCode varchar(10) NOT NULL,
    CountryName nvarchar(100) NOT NULL,
    Continent nvarchar(50) NULL,
    Population bigint NULL,
    LifeExpectancy decimal(5,2) NULL,
    GDPPerCapita decimal(12,2) NULL,
    CONSTRAINT PK_Countries PRIMARY KEY (CountryCode)
);
GO

-- Crear la tabla CovidData
CREATE TABLE dbo.CovidData (
    id int NOT NULL IDENTITY(1,1),
    CountryCode varchar(10) NOT NULL,
    RecordDate date NOT NULL,
    TotalCases bigint NULL,
    NewCases int NULL,
    TotalDeaths int NULL,
    NewDeaths int NULL,
    TotalVaccinations bigint NULL,
    MortalityRate AS (CASE 
                      WHEN TotalCases > 0 THEN 
                        (CAST(TotalDeaths AS decimal(38,22)) / CAST(TotalCases AS decimal(38,22))) 
                      ELSE NULL 
                     END) PERSISTED,
    CONSTRAINT PK_CovidData PRIMARY KEY (id),
    CONSTRAINT FK_CovidData_Countries FOREIGN KEY (CountryCode) REFERENCES dbo.Countries(CountryCode)
);
GO

-- Crear un índice compuesto para mejorar consultas por país y fecha
CREATE INDEX IX_CovidData_CountryDate ON dbo.CovidData (CountryCode, RecordDate);
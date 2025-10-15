# 🌞 SolSage Project: Essential Solcast Parameters

The **SolSage** project focuses on:

- **Solar irradiance prediction** (for performance benchmarking and generation analysis)  
- **Energy yield estimation** (for rooftop and ground PV systems)  
- **Environmental correction** (for performance ratio, cleaning losses, and efficiency drop)

These are the parameters that actually matter for the use case.  
You don’t need every bit of meteorological trivia Solcast throws at you.

---

## 🌞 Core Solar Irradiance Parameters (must-have)

These directly define how much solar energy your panels receive.

| **Key** | **Why it matters** |
|----------|--------------------|
| `ghi` | Global Horizontal Irradiance — total sunlight on a flat surface; baseline for solar yield. |
| `dni` | Direct Normal Irradiance — sunlight hitting perpendicularly; crucial for tracking arrays. |
| `dhi` | Diffuse Horizontal Irradiance — scattered light; affects cloudy-day performance. |
| `gti` | Global Tilted Irradiance — actual energy received by your PV panel’s tilt/orientation; most important metric for PV output. |
| `clearsky_ghi`, `clearsky_dni`, `clearsky_dhi`, `clearsky_gti` | Theoretical “no cloud” irradiance — helps compute performance ratios and efficiency under ideal vs. actual conditions. |

---

## ☁️ Atmospheric & Cloud Influence (for accuracy correction)

| **Key** | **Why it matters** |
|----------|--------------------|
| `cloud_opacity` | Determines how much solar input is lost to clouds — essential for real-time correction. |
| `albedo` | Reflectivity of ground surfaces — influences bifacial panel yield. |
| `precipitable_water` | Affects shortwave radiation absorption; fine-tunes irradiance estimates. |

---

## 🌡️ Temperature & Environmental Conditions (for PV efficiency)

| **Key** | **Why it matters** |
|----------|--------------------|
| `air_temp` | Panel temperature impacts efficiency; used in power derating formulas. |
| `dewpoint_temp` | Helps detect condensation risk or low-temp efficiency dips. |
| `relative_humidity` | Optional, but good for secondary performance diagnostics. |
| `surface_pressure` | Minor impact; sometimes used in irradiance modeling refinements. |

---

## 💨 Wind & Snow Loss Factors (for yield loss and soiling models)

| **Key** | **Why it matters** |
|----------|--------------------|
| `wind_speed_10m` | Affects cooling of panels (temp coefficient) and helps detect extreme weather. |
| `snow_soiling_rooftop`, `snow_soiling_ground` | Critical for winter regions — quantifies DC loss due to snow. |
| `snowfall_rate` | Optional — used if you want to predict cleaning needs or energy dips. |

---

## ⚡ Optional / Contextual Parameters

| **Key** | **Why it matters** |
|----------|--------------------|
| `weather_type` | Simple categorization for user-facing visualization (sunny, cloudy, etc.). |
| `precipitation_rate` | Optional, helps correlate with PV underperformance or cleaning needs. |
| `zenith`, `azimuth` | Use if you’re computing your own sun-angle corrections or visualization. |

---

## 🚫 Not Needed

Parameters such as:  
`wind_direction_*`, `cape`, `snow_depth`, `snow_water_equivalent`,  
`min_air_temp`, `max_air_temp`, and percentile versions (`ghi10`, `dni90`, etc.)  
are **overkill** unless you’re doing probabilistic forecasts or meteorological research.

---

## ✅ Final Shortlist for SolSage API Calls

```text
ghi
dni
dhi
gti
clearsky_ghi
clearsky_dni
clearsky_dhi
clearsky_gti
cloud_opacity
albedo
air_temp
dewpoint_temp
relative_humidity
wind_speed_10m
precipitable_water
snow_soiling_rooftop
snow_soiling_ground
weather_type
precipitation_rate
zenith
azimuth

const CWA_API_TOKEN = 'CWA-5EB69EC7-266F-4586-A95D-293B22114E37';

const CWA_LOCATIONS = [
  '基隆市',
  '新北市',
  '臺北市',
  '桃園市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '臺中市',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '臺南市',
  '高雄市',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '臺東縣',
  '澎湖縣',
  '金門縣',
  '連江縣'
];

const FORECAST_FACTORS = [
  { value: '最高溫度', label: '最高溫度' },
  { value: '最低溫度', label: '最低溫度' },
  { value: '平均溫度', label: '平均溫度' },
  { value: '最高體感溫度', label: '最高體感溫度' },
  { value: '最低體感溫度', label: '最低體感溫度' },
  { value: '天氣概況', label: '天氣概況' },
  { value: '天氣預報綜合描述', label: '天氣預報綜合描述' },
  { value: '降雨機率', label: '降雨機率' },
  { value: '風速', label: '風速' },
  { value: '風向', label: '風向' },
  { value: '紫外線指數', label: '紫外線指數' },
  { value: '平均相對濕度', label: '平均相對濕度' },
  { value: '平均露點溫度', label: '平均露點溫度' },
  { value: '最大舒適度指數', label: '最大舒適度指數' },
  { value: '最小舒適度指數', label: '最小舒適度指數' }
];

const FACTOR_MAP = {
  '最高溫度': '最高溫度',
  '最低溫度': '最低溫度',
  '天氣概況': '天氣現象',
  '天氣預報綜合描述': '天氣預報綜合描述',
  '降雨機率': '12小時降雨機率',
  '風速': '風速',
  '風向': '風向',
  '平均溫度': '平均溫度',
  '平均相對濕度': '平均相對濕度',
  '平均露點溫度': '平均露點溫度',
  '最高體感溫度': '最高體感溫度',
  '最低體感溫度': '最低體感溫度',
  '最大舒適度指數': '最大舒適度指數',
  '最小舒適度指數': '最小舒適度指數',
  '紫外線指數': '紫外線指數'
};

const DEFAULT_CITY = '臺北市';

function init() {
  populateCitySelect();
  populateFactorSelect();
  bindEvents();
  initDefaultWeather();
}

function bindEvents() {
  const form = document.getElementById('weather-form');
  const citySelect = document.getElementById('city-select');
  const factorSelect = document.getElementById('factor-select');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const city = citySelect.value;
    const factor = factorSelect.value;
    if (city && factor) await requestWeather(city, factor);
  });

  citySelect.addEventListener('change', async () => {
    const city = citySelect.value;
    const factor = factorSelect.value;
    if (city && factor) await requestWeather(city, factor);
  });

  factorSelect.addEventListener('change', async () => {
    const city = citySelect.value;
    const factor = factorSelect.value;
    if (city && factor) await requestWeather(city, factor);
  });
}

function populateCitySelect() {
  const select = document.getElementById('city-select');
  select.innerHTML = CWA_LOCATIONS.map((location) => `<option value="${location}">${location}</option>`).join('');
}

function populateFactorSelect() {
  const select = document.getElementById('factor-select');
  select.innerHTML = FORECAST_FACTORS.map((factor) => `<option value="${factor.value}">${factor.label}</option>`).join('');
}

async function initDefaultWeather() {
  const citySelect = document.getElementById('city-select');
  const factorSelect = document.getElementById('factor-select');
  citySelect.value = DEFAULT_CITY;
  factorSelect.value = FORECAST_FACTORS[0].value;
  await requestWeather(DEFAULT_CITY, factorSelect.value);
}

function normalizeLocationName(name) {
  if (!name) return '';
  return name.trim().replace(/台/g, '臺');
}

function parseForecastItemValue(timeItem, elementName) {
  if (!timeItem) return '無資料';
  const elementValue = timeItem.ElementValue ?? timeItem.elementValue;
  if (!elementValue) return '無資料';

  const extractFromObj = (obj) => {
    if (!obj) return null;
    if (obj.value != null) return obj.value;
    const preferKeys = [
      'ProbabilityOfPrecipitation', 'PoP',
      'Weather', 'WeatherDescription', 'ParameterValue', 'ParameterName', 'ParameterUnit', 'Value',
      'MaxTemperature', 'MinTemperature', 'Temperature',
      'MaxApparentTemperature', 'MinApparentTemperature', 'MaxComfortIndex', 'MinComfortIndex',
      'UltravioletIndex', 'UVI', 'ComfortIndex', 'WindSpeed', 'WindDirection'
    ];
    for (const k of preferKeys) {
      if (obj[k] != null) return obj[k];
    }
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' || typeof v === 'number') return v;
    }
    return null;
  };

  if (Array.isArray(elementValue)) {
    const first = elementValue[0] || {};
    if (elementName === '天氣現象') {
      return first['Weather'] ?? first['WeatherDescription'] ?? extractFromObj(first) ?? '無資料';
    }
    if (elementName === '12小時降雨機率') {
      return first['ProbabilityOfPrecipitation'] ?? first['PoP'] ?? extractFromObj(first) ?? '無資料';
    }
    return extractFromObj(first) ?? '無資料';
  }

  if (typeof elementValue === 'object') {
    if (elementName === '天氣現象') {
      return elementValue['Weather'] ?? elementValue['WeatherDescription'] ?? extractFromObj(elementValue) ?? '無資料';
    }
    if (elementName === '12小時降雨機率') {
      return elementValue['ProbabilityOfPrecipitation'] ?? elementValue['PoP'] ?? extractFromObj(elementValue) ?? '無資料';
    }
    return extractFromObj(elementValue) ?? '無資料';
  }

  return elementValue ?? '無資料';
}

async function requestWeather(city, factor) {
  const weatherResult = document.getElementById('weather-result');
  const forecastResult = document.getElementById('forecast-result');
  const scoreResult = document.getElementById('score-result');
  weatherResult.innerHTML = '<p>查詢中，請稍候...</p>';
  forecastResult.innerHTML = '';
  scoreResult.innerHTML = '';

  if (!CWA_API_TOKEN || CWA_API_TOKEN === 'YOUR_CWA_API_TOKEN') {
    weatherResult.innerHTML = `<p>請在 <code>script.js</code> 裡填入有效的 CWA API Token。</p>`;
    return;
  }

  const locationName = normalizeLocationName(city);
  if (!locationName) {
    weatherResult.innerHTML = '<p>請選擇有效的台灣城市或縣市。</p>';
    return;
  }

  try {
    const elementName = FACTOR_MAP[factor] || factor;
    const apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${CWA_API_TOKEN}&ElementName=${encodeURIComponent(elementName)}&sort=time`;
    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error('資料查詢失敗，請檢查 API Token 或網路連線。');
    }

    const data = await res.json();
    const locations = data.records?.Locations?.[0]?.Location ?? [];
    const normalizedLocationName = normalizeLocationName(locationName);
    const location = locations.find((item) => normalizeLocationName(item.LocationName) === normalizedLocationName);
    if (!location) {
      throw new Error('找不到該行政區的資料，請確認是否支援該城市或縣市。');
    }

    const forecastList = parseCwaForecast(location, elementName);
    if (!forecastList.length) {
      throw new Error('未取得預報資料。');
    }

    renderSummary(locationName, factor, weatherResult);
    renderForecast(forecastList, forecastResult);
    renderScore(forecastList, factor, scoreResult);
  } catch (error) {
    weatherResult.innerHTML = `<p>錯誤：${error.message}</p>`;
  }
}

function renderSummary(city, factor, container) {
  container.innerHTML = `
    <div class="result-card">
      <h3>${city}</h3>
      <p>預報因子：<strong>${factor}</strong></p>
      <p>資料來源：中央氣象局開放資料 F-D0047-091</p>
    </div>
  `;
}

function renderForecast(forecastList, container) {
  if (!forecastList.length) {
    container.innerHTML = '<p>無預報資料。</p>';
    return;
  }

  const html = forecastList.map((item) => {
    const label = `${item.startTime.replace('T', ' ')} ~ ${item.endTime.replace('T', ' ')}`;
    return `
      <div class="forecast-item">
        <p><strong>${label}</strong></p>
        <p>值：${item.value}</p>
      </div>
    `;
  }).join('');
  container.innerHTML = html;
}

function parseCwaForecast(location, factor) {
  const element = location.WeatherElement?.find((item) => item.ElementName === factor);
  if (!element) return [];
  const timeList = element.Time ?? [];
  return timeList.map((item) => ({
    startTime: item.StartTime,
    endTime: item.EndTime,
    elementName: factor,
    value: parseForecastItemValue(item, factor)
  }));
}

function calculateScoreByFactor(factor, rawValue) {
  const value = String(rawValue).trim();
  let score = 50;
  let reason = '資料不足，建議以實際天氣為主。';

  if (factor === '最高溫度' || factor === '最低溫度') {
    const temp = parseFloat(value);
    if (Number.isNaN(temp)) {
      score = 50;
      reason = '溫度資料不足。';
    } else if (temp >= 30) {
      score = 40;
      reason = '炎熱，較不適合外出。';
    } else if (temp >= 25) {
      score = 70;
      reason = '溫暖但可能稍熱，適合短暫外出。';
    } else if (temp >= 20) {
      score = 90;
      reason = '舒適，非常適合外出。';
    } else if (temp >= 15) {
      score = 80;
      reason = '稍涼，適合外出並做好薄外套。';
    } else {
      score = 60;
      reason = '偏冷，請適度保暖。';
    }
  } else if (factor === '降雨機率') {
    const pop = parseFloat(value);
    if (Number.isNaN(pop)) {
      score = 50;
      reason = '降雨機率資料不足。';
    } else {
      score = Math.max(0, Math.min(100, 100 - pop));
      reason = pop >= 70 ? '降雨機率高，不太適合外出。' : pop >= 40 ? '可能有雨，建議攜帶雨具。' : '大致晴朗，適合外出。';
    }
  } else if (factor === '風速') {
    const wind = parseFloat(value);
    if (Number.isNaN(wind)) {
      score = 50;
      reason = '風速資料不足。';
    } else if (wind >= 10) {
      score = 40;
      reason = '風大，較不適合外出。';
    } else if (wind >= 5) {
      score = 70;
      reason = '有風，建議注意穩定。';
    } else {
      score = 90;
      reason = '風速和緩，適合外出。';
    }
  } else if (factor === '天氣概況') {
    const desc = value;
    if (desc.includes('雨') || desc.includes('雷')) {
      score = 40;
      reason = '天氣不穩定，不太適合外出。';
    } else if (desc.includes('晴') || desc.includes('多雲')) {
      score = 90;
      reason = '晴朗或多雲，適合外出。';
    } else {
      score = 70;
      reason = '天氣一般，請注意未來變化。';
    }
  } else if (factor === '平均溫度' || factor === '最高體感溫度' || factor === '最低體感溫度') {
    const temp = parseFloat(value);
    if (Number.isNaN(temp)) {
      score = 50;
      reason = '溫度資料不足。';
    } else if (temp >= 30) {
      score = 40;
      reason = '炎熱，較不適合外出。';
    } else if (temp >= 25) {
      score = 70;
      reason = '溫暖但可能稍熱，適合短暫外出。';
    } else if (temp >= 20) {
      score = 90;
      reason = '舒適，非常適合外出。';
    } else if (temp >= 15) {
      score = 80;
      reason = '稍涼，適合外出並做好薄外套。';
    } else {
      score = 60;
      reason = '偏冷，請適度保暖。';
    }
  } else if (factor === '天氣預報綜合描述') {
    const desc = value;
    if (desc.includes('雨') || desc.includes('雷')) {
      score = 40;
      reason = '預報有雨，建議攜帶雨具。';
    } else if (desc.includes('晴')) {
      score = 90;
      reason = '預報晴朗，適合外出。';
    } else {
      score = 75;
      reason = '天氣正常，注意即時觀察。';
    }
  } else if (factor === '風向') {
    score = 75;
    reason = '風向資訊提供參考，需搭配風速判斷。';
  } else if (factor === '紫外線指數') {
    const uvi = parseFloat(value);
    if (Number.isNaN(uvi)) {
      score = 50;
      reason = '紫外線資料不足。';
    } else if (uvi >= 8) {
      score = 30;
      reason = '紫外線很強，盡量避免長時間曝曬。';
    } else if (uvi >= 6) {
      score = 50;
      reason = '紫外線高，建議防曬與遮陽。';
    } else if (uvi >= 3) {
      score = 75;
      reason = '紫外線中等，可做基本防護。';
    } else {
      score = 95;
      reason = '紫外線低，適合外出。';
    }
  } else if (factor === '平均相對濕度') {
    const rh = parseFloat(value);
    if (Number.isNaN(rh)) {
      score = 50;
      reason = '濕度資料不足。';
    } else if (rh >= 90) {
      score = 50;
      reason = '非常潮濕，較不舒服。';
    } else if (rh >= 80) {
      score = 65;
      reason = '偏潮濕，可能不太舒服。';
    } else if (rh >= 60) {
      score = 85;
      reason = '濕度適中，舒適。';
    } else {
      score = 90;
      reason = '乾爽，適合外出。';
    }
  } else if (factor === '最大舒適度指數' || factor === '最小舒適度指數') {
    const ci = parseFloat(value);
    if (Number.isNaN(ci)) {
      score = 60;
      reason = '舒適度資料不足。';
    } else if (ci >= 4) {
      score = 95;
      reason = '舒適，非常適合外出。';
    } else if (ci >= 3) {
      score = 80;
      reason = '舒適度良好，適合外出。';
    } else {
      score = 60;
      reason = '舒適度較差，請酌量評估。';
    }
  }

  return { score, reason };
}

function renderScore(forecastList, factor, container) {
  const grouped = forecastList.reduce((acc, item) => {
    const date = item.startTime.split('T')[0];
    const detail = calculateScoreByFactor(factor, item.value);
    if (!acc[date]) acc[date] = [];
    acc[date].push(detail);
    return acc;
  }, {});

  const html = Object.entries(grouped).map(([date, details]) => {
    const averageScore = Math.round(details.reduce((sum, d) => sum + d.score, 0) / details.length);
    const reason = details[0]?.reason || '';
    return `
      <div class="result-card">
        <h3>${date}</h3>
        <p>外出適宜分數：<strong>${averageScore}</strong></p>
        <p>${reason}</p>
      </div>
    `;
  }).join('');

  container.innerHTML = html || '<p>無外出適宜分數。</p>';
}

window.addEventListener('DOMContentLoaded', init);

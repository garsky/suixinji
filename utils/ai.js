const parseBillImage = async (filePath, provider, apiKey, model, baseUrl) => {
  const fileManager = wx.getFileSystemManager()
  const fileData = fileManager.readFileSync(filePath, 'base64')

  const prompt = `你是一个账单解析助手。请解析这张账单截图，提取每一条消费记录。

返回JSON数组，每条记录包含：
- date: 日期（格式 MM/DD）
- merchant: 商户名称
- amount: 金额（数字，正数表示支出）
- category: 建议分类（从以下选择：餐饮/交通/购物/居住/娱乐/通讯/医疗/教育/其他）
- confidence: 识别置信度（high/medium/low）

仅返回JSON数组，不要其他内容。`

  let apiUrl = ''
  let requestBody = {}

  switch (provider) {
    case 'openai':
      apiUrl = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions`
      requestBody = {
        model: model || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${fileData}` } }
            ]
          }
        ],
        max_tokens: 4096
      }
      break
    case 'claude':
      apiUrl = `${baseUrl || 'https://api.anthropic.com'}/v1/messages`
      requestBody = {
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fileData } },
              { type: 'text', text: prompt }
            ]
          }
        ]
      }
      break
    case 'qwen':
      apiUrl = `${baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode'}/v1/chat/completions`
      requestBody = {
        model: model || 'qwen-vl-max',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${fileData}` } },
              { type: 'text', text: prompt }
            ]
          }
        ]
      }
      break
    case 'deepseek':
      apiUrl = `${baseUrl || 'https://api.deepseek.com'}/v1/chat/completions`
      requestBody = {
        model: model || 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${fileData}` } }
            ]
          }
        ],
        max_tokens: 4096
      }
      break
    default:
      apiUrl = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions`
      requestBody = {
        model: model || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${fileData}` } }
            ]
          }
        ],
        max_tokens: 4096
      }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl,
      method: 'POST',
      header: buildHeaders(provider, apiKey),
      data: requestBody,
      success: res => {
        if (res.statusCode === 200) {
          const content = extractContent(provider, res.data)
          try {
            const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const bills = JSON.parse(jsonStr)
            resolve(bills)
          } catch (e) {
            reject(new Error('AI返回内容解析失败: ' + content))
          }
        } else {
          reject(new Error(`API请求失败: ${res.statusCode} ${JSON.stringify(res.data)}`))
        }
      },
      fail: err => reject(err)
    })
  })
}

const buildHeaders = (provider, apiKey) => {
  switch (provider) {
    case 'claude':
      return {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      }
    default:
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
  }
}

const extractContent = (provider, data) => {
  switch (provider) {
    case 'claude':
      return data.content[0].text
    default:
      return data.choices[0].message.content
  }
}

const testConnection = (provider, apiKey, model, baseUrl) => {
  let apiUrl = ''
  let requestBody = {}

  switch (provider) {
    case 'claude':
      apiUrl = `${baseUrl || 'https://api.anthropic.com'}/v1/messages`
      requestBody = {
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }]
      }
      break
    default:
      apiUrl = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions`
      requestBody = {
        model: model || 'gpt-4o',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }]
      }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl,
      method: 'POST',
      header: buildHeaders(provider, apiKey),
      data: requestBody,
      success: res => {
        if (res.statusCode === 200) {
          resolve('连接成功')
        } else {
          reject(new Error(`连接失败: ${res.statusCode}`))
        }
      },
      fail: err => reject(err)
    })
  })
}

module.exports = {
  parseBillImage,
  testConnection
}

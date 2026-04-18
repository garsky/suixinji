const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const buildHeaders = (provider, apiKey) => {
  switch (provider) {
    case 'claude':
      return {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    default:
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
  }
}

const buildTestRequest = (provider, apiKey, model, baseUrl) => {
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
    case 'qwen':
      apiUrl = `${baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode'}/v1/chat/completions`
      requestBody = {
        model: model || 'qwen-vl-max',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }]
      }
      break
    case 'deepseek':
      apiUrl = `${baseUrl || 'https://api.deepseek.com'}/v1/chat/completions`
      requestBody = {
        model: model || 'deepseek-chat',
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

  return { apiUrl, requestBody }
}

const buildParseRequest = (provider, apiKey, model, baseUrl, fileData, prompt) => {
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

  return { apiUrl, requestBody }
}

const extractContent = (provider, data) => {
  switch (provider) {
    case 'claude':
      return data.content[0].text
    default:
      return data.choices[0].message.content
  }
}

exports.main = async (event) => {
  const { action, provider, apiKey, model, baseUrl } = event

  try {
    if (action === 'test') {
      const { apiUrl, requestBody } = buildTestRequest(provider, apiKey, model, baseUrl)
      const headers = buildHeaders(provider, apiKey)

      const res = await axios.post(apiUrl, requestBody, { headers, timeout: 15000 })

      return { code: 0, message: '连接成功' }
    }

    if (action === 'parse') {
      const { fileData, prompt } = event
      const { apiUrl, requestBody } = buildParseRequest(provider, apiKey, model, baseUrl, fileData, prompt)
      const headers = buildHeaders(provider, apiKey)

      const res = await axios.post(apiUrl, requestBody, { headers, timeout: 60000 })

      const content = extractContent(provider, res.data)
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const bills = JSON.parse(jsonStr)

      return { code: 0, data: bills }
    }

    return { code: 400, message: 'unknown action' }
  } catch (err) {
    const errMsg = err.response
      ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
      : err.message
    return { code: 500, message: errMsg }
  }
}

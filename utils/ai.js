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

  try {
    const res = await wx.cloud.callFunction({
      name: 'aiProxy',
      data: {
        action: 'parse',
        provider,
        apiKey,
        model,
        baseUrl,
        fileData,
        prompt
      }
    })

    if (res.result.code === 0) {
      return res.result.data
    } else {
      throw new Error(res.result.message || 'AI解析失败')
    }
  } catch (err) {
    const msg = (err && err.message) || (err && err.errMsg) || String(err) || '未知错误'
    throw new Error(msg)
  }
}

const testConnection = async (provider, apiKey, model, baseUrl) => {
  try {
    const res = await wx.cloud.callFunction({
      name: 'aiProxy',
      data: {
        action: 'test',
        provider,
        apiKey,
        model,
        baseUrl
      }
    })

    if (res.result.code === 0) {
      return '连接成功'
    } else {
      throw new Error(res.result.message || '连接失败')
    }
  } catch (err) {
    const msg = (err && err.message) || (err && err.errMsg) || String(err) || '未知错误'
    throw new Error(msg)
  }
}

module.exports = {
  parseBillImage,
  testConnection
}

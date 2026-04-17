const ai = require('../../utils/ai')
const db = require('../../utils/db')
const app = getApp()

Page({
  data: {
    aiConfig: {
      provider: 'openai',
      api_key: '',
      model: '',
      base_url: ''
    },
    providerOptions: [
      { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
      { value: 'claude', label: 'Claude', models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022'] },
      { value: 'qwen', label: '通义千问', models: ['qwen-vl-max', 'qwen-vl-plus'] },
      { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat'] }
    ],
    currentProviderIndex: 0,
    currentModelIndex: 0,
    availableModels: [],
    dailyBudget: '',
    password: '',
    categories: [],
    strategyTemplates: [],
    testing: false,
    testResult: '',
    showPassword: false
  },

  onLoad() {
    this.loadConfig()
  },

  loadConfig() {
    db.getUserConfig('default').then(res => {
      if (res.data.length > 0) {
        const config = res.data[0]
        const providerIndex = this.data.providerOptions.findIndex(p => p.value === (config.ai_provider || 'openai'))
        const models = providerIndex >= 0 ? this.data.providerOptions[providerIndex].models : []
        const modelIndex = models.indexOf(config.ai_model || '')

        this.setData({
          aiConfig: {
            provider: config.ai_provider || 'openai',
            api_key: config.ai_key || '',
            model: config.ai_model || '',
            base_url: config.ai_base_url || ''
          },
          currentProviderIndex: providerIndex >= 0 ? providerIndex : 0,
          availableModels: models,
          currentModelIndex: modelIndex >= 0 ? modelIndex : 0,
          dailyBudget: config.daily_budget ? String(config.daily_budget) : '',
          password: config.password || ''
        })
      }
    }).catch(() => {})

    this.setData({
      categories: app.globalData.categories.expense,
      strategyTemplates: app.globalData.defaultTemplates
    })
  },

  onProviderChange(e) {
    const index = e.detail.value
    const provider = this.data.providerOptions[index]
    const models = provider.models
    this.setData({
      currentProviderIndex: index,
      availableModels: models,
      currentModelIndex: 0,
      'aiConfig.provider': provider.value,
      'aiConfig.model': models[0]
    })
  },

  onModelChange(e) {
    const index = e.detail.value
    this.setData({
      currentModelIndex: index,
      'aiConfig.model': this.data.availableModels[index]
    })
  },

  onApiKeyInput(e) {
    this.setData({ 'aiConfig.api_key': e.detail.value })
  },

  onBaseUrlInput(e) {
    this.setData({ 'aiConfig.base_url': e.detail.value })
  },

  onTestConnection() {
    const { provider, api_key, model, base_url } = this.data.aiConfig
    if (!api_key) {
      wx.showToast({ title: '请先输入API Key', icon: 'none' })
      return
    }

    this.setData({ testing: true, testResult: '' })
    ai.testConnection(provider, api_key, model || undefined, base_url || undefined)
      .then(() => {
        this.setData({ testing: false, testResult: '✅ 连接成功' })
      })
      .catch(err => {
        this.setData({ testing: false, testResult: '❌ ' + err.message })
      })
  },

  onSaveAIConfig() {
    const { aiConfig } = this.data
    if (!aiConfig.api_key) {
      wx.showToast({ title: '请输入API Key', icon: 'none' })
      return
    }

    db.setUserConfig('default', {
      ai_provider: aiConfig.provider,
      ai_key: aiConfig.api_key,
      ai_model: aiConfig.model,
      ai_base_url: aiConfig.base_url,
      updated: new Date()
    }).then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' })
    }).catch(() => {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  onDailyBudgetInput(e) {
    this.setData({ dailyBudget: e.detail.value })
  },

  onSaveBudget() {
    db.setUserConfig('default', {
      daily_budget: parseFloat(this.data.dailyBudget) || 0,
      updated: new Date()
    }).then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' })
    }).catch(() => {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onTogglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  onSavePassword() {
    if (!this.data.password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    db.setUserConfig('default', {
      password: this.data.password,
      updated: new Date()
    }).then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' })
    }).catch(() => {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  onAddCategory() {
    wx.showModal({
      title: '添加分类',
      editable: true,
      placeholderText: '输入分类名',
      success: res => {
        if (res.confirm && res.content) {
          const categories = [...this.data.categories, res.content.trim()]
          this.setData({ categories })
          app.globalData.categories.expense = categories
        }
      }
    })
  },

  onDeleteCategory(e) {
    const { index } = e.currentTarget.dataset
    const categories = [...this.data.categories]
    categories.splice(index, 1)
    this.setData({ categories })
    app.globalData.categories.expense = categories
  }
})

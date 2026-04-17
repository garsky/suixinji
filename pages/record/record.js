const { generateId, formatTime, formatAmount } = require('../../utils/util')
const ai = require('../../utils/ai')
const db = require('../../utils/db')

const app = getApp()

Page({
  data: {
    mode: 'manual',
    bills: [],
    confirmedCount: 0,
    pendingCount: 0,
    unknownCount: 0,
    manualBill: {
      amount: '',
      category: '',
      channel: '',
      merchant: '',
      tags: [],
      level: 'daily',
      type: 'expense'
    },
    showCategoryPicker: false,
    showChannelPicker: false,
    showStrategyPanel: false,
    showSingleEdit: false,
    editingBill: null,
    strategy: {
      name: '',
      conditions: { date_from: '', date_to: '', category: null, merchant_keyword: null, amount_min: null, amount_max: null },
      actions: { add_tags: [], set_project: '', set_level: 'extra' }
    },
    strategyTemplates: [],
    previewBills: [],
    previewCount: 0,
    previewAmount: 0,
    parsing: false,
    uploading: false,
    categories: [],
    channels: []
  },

  onLoad(options) {
    this.setData({
      categories: app.globalData.categories,
      channels: app.globalData.channels
    })

    if (options.id) {
      this.loadBill(options.id)
    }

    this.loadStrategyTemplates()
  },

  loadBill(id) {
    const bills = JSON.parse(wx.getStorageSync('bills') || '[]')
    const bill = bills.find(b => b._id === id)
    if (bill) {
      this.setData({
        mode: 'manual',
        manualBill: bill,
        showSingleEdit: true,
        editingBill: bill
      })
    }
  },

  loadStrategyTemplates() {
    const templates = app.globalData.defaultTemplates.map(t => ({
      ...t,
      conditions: { ...t.conditions },
      actions: { ...t.actions, add_tags: [...t.actions.add_tags] }
    }))
    this.setData({ strategyTemplates: templates })

    db.getStrategyTemplates('default').then(res => {
      if (res.data.length > 0) {
        this.setData({ strategyTemplates: [...templates, ...res.data] })
      }
    }).catch(() => {})
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 5,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const files = res.tempFiles.map(f => f.tempFilePath)
        this.parseImages(files)
      }
    })
  },

  async parseImages(filePaths) {
    this.setData({ parsing: true, mode: 'parse' })
    wx.showLoading({ title: 'AI解析中...' })

    try {
      const config = await this.getAIConfig()
      if (!config) {
        wx.hideLoading()
        this.setData({ parsing: false })
        return
      }

      let allBills = []
      for (const filePath of filePaths) {
        const bills = await ai.parseBillImage(
          filePath, config.provider, config.apiKey, config.model, config.baseUrl
        )
        allBills = allBills.concat(bills)
      }

      const processedBills = allBills.map(bill => ({
        _id: generateId(),
        date: bill.date,
        merchant: bill.merchant,
        amount: bill.amount,
        category: bill.category || '其他',
        confidence: bill.confidence || 'medium',
        channel: '',
        source: '',
        tags: [],
        level: 'daily',
        type: 'expense',
        project: null,
        status: bill.confidence === 'high' ? 'confirmed' : 'pending'
      }))

      const confirmedCount = processedBills.filter(b => b.status === 'confirmed').length
      const pendingCount = processedBills.filter(b => b.confidence === 'medium').length
      const unknownCount = processedBills.filter(b => b.confidence === 'low').length

      this.setData({
        bills: processedBills,
        confirmedCount,
        pendingCount,
        unknownCount,
        parsing: false
      })
      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      this.setData({ parsing: false })
      wx.showToast({ title: '解析失败: ' + err.message, icon: 'none', duration: 3000 })
    }
  },

  async getAIConfig() {
    try {
      const res = await db.getUserConfig('default')
      if (res.data.length > 0 && res.data[0].ai_key) {
        return {
          provider: res.data[0].ai_provider || 'openai',
          apiKey: res.data[0].ai_key,
          model: res.data[0].ai_model || 'gpt-4o',
          baseUrl: res.data[0].ai_base_url || ''
        }
      }
      wx.showModal({
        title: '未配置AI',
        content: '请先在设置中配置AI模型API Key',
        confirmText: '去设置',
        success: res => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/settings/settings' })
          }
        }
      })
      return null
    } catch {
      return null
    }
  },

  onBillConfirm(e) {
    const { index } = e.currentTarget.dataset
    const bills = this.data.bills
    bills[index].status = 'confirmed'
    this.setData({ bills })
    this.updateCounts()
  },

  onBillEdit(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      showSingleEdit: true,
      editingBill: { ...this.data.bills[index] },
      editingIndex: index
    })
  },

  onBillDelete(e) {
    const { index } = e.currentTarget.dataset
    const bills = this.data.bills
    bills.splice(index, 1)
    this.setData({ bills })
    this.updateCounts()
  },

  onSingleEditField(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value || e.detail
    const editingBill = { ...this.data.editingBill }
    editingBill[field] = value
    this.setData({ editingBill })
  },

  onSingleEditSave() {
    const { editingBill, editingIndex, bills } = this.data
    bills[editingIndex] = { ...editingBill, status: 'adjusted' }
    this.setData({ bills, showSingleEdit: false, editingBill: null })
    this.updateCounts()
  },

  onSingleEditCancel() {
    this.setData({ showSingleEdit: false, editingBill: null })
  },

  onSingleEditTag(e) {
    const { value } = e.detail
    const editingBill = { ...this.data.editingBill }
    editingBill.tags = value
    this.setData({ editingBill })
  },

  updateCounts() {
    const bills = this.data.bills
    this.setData({
      confirmedCount: bills.filter(b => b.status === 'confirmed' || b.status === 'adjusted').length,
      pendingCount: bills.filter(b => b.confidence === 'medium' && b.status === 'pending').length,
      unknownCount: bills.filter(b => b.confidence === 'low' && b.status === 'pending').length
    })
  },

  onConfirmAll() {
    const bills = this.data.bills.map(b => ({ ...b, status: 'confirmed' }))
    this.setData({ bills, confirmedCount: bills.length, pendingCount: 0, unknownCount: 0 })
  },

  async onSaveBills() {
    const { bills } = this.data
    const unconfirmed = bills.filter(b => b.status === 'pending')
    if (unconfirmed.length > 0) {
      const res = await wx.showModal({
        title: '提示',
        content: `还有${unconfirmed.length}条未确认，是否确认全部后保存？`,
        confirmText: '确认全部保存',
        cancelText: '仅保存已确认'
      })
      if (res.confirm) {
        this.onConfirmAll()
      }
    }

    const toSave = bills.filter(b => b.status !== 'pending')
    if (toSave.length === 0) {
      wx.showToast({ title: '没有可保存的账单', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    try {
      const now = new Date()
      const year = now.getFullYear()
      const saveData = toSave.map(bill => ({
        user_id: 'default',
        date: new Date(`${year}/${bill.date}`),
        merchant: bill.merchant,
        amount: bill.amount,
        type: bill.type || 'expense',
        category: bill.category,
        level: bill.level || 'daily',
        channel: bill.channel,
        source: bill.source,
        tags: bill.tags || [],
        project: bill.project || null,
        status: bill.status,
        note: '',
        created: now,
        updated: now
      }))

      await db.batchAddBills(saveData)
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.setData({ bills: [], mode: 'manual' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onShowStrategy() {
    this.setData({ showStrategyPanel: true })
  },

  onHideStrategy() {
    this.setData({ showStrategyPanel: false, previewBills: [] })
  },

  onSelectTemplate(e) {
    const { index } = e.currentTarget.dataset
    const template = this.data.strategyTemplates[index]
    this.setData({
      strategy: {
        name: template.name,
        conditions: { ...template.conditions },
        actions: { ...template.actions, add_tags: [...template.actions.add_tags] }
      }
    })
  },

  onStrategyFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    const strategy = { ...this.data.strategy }

    if (field.startsWith('conditions.')) {
      const key = field.replace('conditions.', '')
      strategy.conditions[key] = value
    } else if (field.startsWith('actions.')) {
      const key = field.replace('actions.', '')
      strategy.actions[key] = value
    } else {
      strategy[field] = value
    }
    this.setData({ strategy })
  },

  onStrategyPreview() {
    const { bills, strategy } = this.data
    const { conditions } = strategy
    const year = new Date().getFullYear()

    const matched = bills.filter(bill => {
      if (conditions.date_from) {
        const billDate = new Date(`${year}/${bill.date}`)
        if (billDate < new Date(conditions.date_from)) return false
      }
      if (conditions.date_to) {
        const billDate = new Date(`${year}/${bill.date}`)
        if (billDate > new Date(conditions.date_to)) return false
      }
      if (conditions.category && bill.category !== conditions.category) return false
      if (conditions.merchant_keyword && !bill.merchant.includes(conditions.merchant_keyword)) return false
      if (conditions.amount_min && bill.amount < conditions.amount_min) return false
      if (conditions.amount_max && bill.amount > conditions.amount_max) return false
      return true
    })

    const totalAmount = matched.reduce((sum, b) => sum + b.amount, 0)

    this.setData({
      previewBills: matched,
      previewCount: matched.length,
      previewAmount: totalAmount
    })
  },

  onStrategyExecute() {
    const { bills, strategy, previewBills } = this.data
    const { actions } = strategy

    const updatedBills = bills.map(bill => {
      const isMatched = previewBills.some(pb => pb._id === bill._id)
      if (!isMatched) return bill

      const updated = { ...bill }
      if (actions.add_tags && actions.add_tags.length) {
        updated.tags = [...new Set([...(bill.tags || []), ...actions.add_tags])]
      }
      if (actions.set_project) {
        updated.project = actions.set_project
      }
      if (actions.set_level) {
        updated.level = actions.set_level
      }
      return updated
    })

    this.setData({
      bills: updatedBills,
      showStrategyPanel: false,
      previewBills: []
    })
    wx.showToast({ title: `已调整${previewBills.length}条`, icon: 'success' })
  },

  onManualInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    const manualBill = { ...this.data.manualBill }
    manualBill[field] = value
    this.setData({ manualBill })
  },

  onManualSave() {
    const { manualBill } = this.data
    if (!manualBill.amount || !manualBill.category) {
      wx.showToast({ title: '请填写金额和分类', icon: 'none' })
      return
    }

    const now = new Date()
    const billData = {
      user_id: 'default',
      date: now,
      merchant: manualBill.merchant || '',
      amount: parseFloat(manualBill.amount),
      type: manualBill.type || 'expense',
      category: manualBill.category,
      level: manualBill.level || 'daily',
      channel: manualBill.channel || '',
      source: '',
      tags: manualBill.tags || [],
      project: null,
      status: 'confirmed',
      note: '',
      created: now,
      updated: now
    }

    db.addBill(billData).then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.setData({
        manualBill: {
          amount: '',
          category: '',
          channel: '',
          merchant: '',
          tags: [],
          level: 'daily',
          type: 'expense'
        }
      })
    }).catch(() => {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  onCategoryPick(e) {
    const { category } = e.detail
    if (this.data.showSingleEdit) {
      const editingBill = { ...this.data.editingBill, category }
      this.setData({ editingBill, showCategoryPicker: false })
    } else {
      const manualBill = { ...this.data.manualBill, category }
      this.setData({ manualBill, showCategoryPicker: false })
    }
  },

  onChannelPick(e) {
    const { channel } = e.detail
    if (this.data.showSingleEdit) {
      const editingBill = { ...this.data.editingBill, channel }
      this.setData({ editingBill, showChannelPicker: false })
    } else {
      const manualBill = { ...this.data.manualBill, channel }
      this.setData({ manualBill, showChannelPicker: false })
    }
  },

  onShowCategoryPicker() {
    this.setData({ showCategoryPicker: true })
  },

  onHideCategoryPicker() {
    this.setData({ showCategoryPicker: false })
  },

  onShowChannelPicker() {
    this.setData({ showChannelPicker: true })
  },

  onHideChannelPicker() {
    this.setData({ showChannelPicker: false })
  },

  onSwitchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  }
})

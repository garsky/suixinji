const db = require('../../utils/db')
const app = getApp()

Page({
  data: {
    bill: null,
    categories: [],
    channels: [],
    showCategoryPicker: false,
    showChannelPicker: false,
    isNew: false
  },

  onLoad(options) {
    this.setData({
      categories: app.globalData.categories.expense,
      channels: app.globalData.channels
    })

    if (options.id) {
      this.loadBill(options.id)
    } else {
      this.setData({
        isNew: true,
        bill: {
          amount: '',
          merchant: '',
          category: '',
          channel: '',
          level: 'daily',
          type: 'expense',
          tags: [],
          project: null
        }
      })
    }
  },

  loadBill(id) {
    const db = wx.cloud.database()
    db.collection('bills').doc(id).get().then(res => {
      const bill = res.data
      if (bill) {
        if (typeof bill.date === 'string') {
          bill.dateStr = bill.date
        } else {
          const d = new Date(bill.date)
          bill.dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        }
        this.setData({ bill })
      } else {
        wx.showToast({ title: '账单不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    }).catch(() => {
      wx.showToast({ title: '账单不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    })
  },

  onFieldInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({ [`bill.${field}`]: value })
  },

  onLevelChange(e) {
    const level = e.currentTarget.dataset.value
    this.setData({ 'bill.level': level })
    if (level === 'daily') {
      this.setData({ 'bill.project': null })
    }
  },

  onShowCategoryPicker() {
    this.setData({ showCategoryPicker: true })
  },

  onHideCategoryPicker() {
    this.setData({ showCategoryPicker: false })
  },

  onCategoryPick(e) {
    const { category } = e.detail
    this.setData({ 'bill.category': category, showCategoryPicker: false })
  },

  onShowChannelPicker() {
    this.setData({ showChannelPicker: true })
  },

  onHideChannelPicker() {
    this.setData({ showChannelPicker: false })
  },

  onChannelPick(e) {
    const { channel } = e.detail
    this.setData({ 'bill.channel': channel, showChannelPicker: false })
  },

  onTagInput(e) {
    const tags = e.detail.value.split(',').map(t => t.trim()).filter(t => t)
    this.setData({ 'bill.tags': tags })
  },

  onProjectInput(e) {
    this.setData({ 'bill.project': e.detail.value || null })
  },

  onRemoveFromProject() {
    this.setData({ 'bill.project': null, 'bill.level': 'daily' })
    wx.showToast({ title: '已移出项目', icon: 'success' })
  },

  onSave() {
    const { bill, isNew } = this.data
    if (!bill.amount || !bill.category) {
      wx.showToast({ title: '请填写金额和分类', icon: 'none' })
      return
    }

    if (isNew) {
      const billData = {
        user_id: 'default',
        date: new Date(),
        merchant: bill.merchant || '',
        amount: parseFloat(bill.amount),
        type: bill.type || 'expense',
        category: bill.category,
        level: bill.level || 'daily',
        channel: bill.channel || '',
        source: '',
        tags: bill.tags || [],
        project: bill.project || null,
        status: 'confirmed',
        note: '',
        created: new Date(),
        updated: new Date()
      }
      db.addBill(billData).then(() => {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      })
    } else {
      const updateData = {
        amount: parseFloat(bill.amount),
        merchant: bill.merchant,
        category: bill.category,
        channel: bill.channel,
        level: bill.level,
        tags: bill.tags,
        project: bill.project,
        updated: new Date()
      }
      db.updateBill(bill._id, updateData).then(() => {
        wx.showToast({ title: '修改成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      })
    }
  },

  onDelete() {
    const { bill } = this.data
    wx.showModal({
      title: '确认删除',
      content: `删除"${bill.merchant || '此账单'}"的 ¥${bill.amount} 记录？`,
      confirmColor: '#e74c3c',
      success: res => {
        if (res.confirm) {
          db.deleteBill(bill._id).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          })
        }
      }
    })
  }
})

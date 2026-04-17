const { formatMonth, formatAmount } = require('../../utils/util')
const db = require('../../utils/db')

Page({
  data: {
    currentMonth: '',
    year: 0,
    month: 0,
    totalExpense: 0,
    dailyExpense: 0,
    extraExpense: 0,
    dailyBudget: 0,
    dailyBudgetStatus: '',
    extraProjects: [],
    recentBills: [],
    loading: true
  },

  onLoad() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    this.setData({
      currentMonth: formatMonth(now),
      year,
      month
    })
  },

  onShow() {
    this.loadMonthData()
  },

  loadMonthData() {
    const { year, month } = this.data
    wx.showLoading({ title: '加载中...' })

    db.getUserConfig('default').then(res => {
      const config = res.data.length > 0 ? res.data[0] : {}
      this.setData({ dailyBudget: config.daily_budget || 0 })
    }).catch(() => {})

    db.getBillsByMonth('default', year, month).then(res => {
      const bills = res.data
      let dailyExpense = 0
      let extraExpense = 0
      const projectMap = {}

      bills.forEach(bill => {
        if (bill.type === 'expense') {
          if (bill.level === 'extra') {
            extraExpense += bill.amount
            if (bill.project) {
              if (!projectMap[bill.project]) {
                projectMap[bill.project] = { name: bill.project, amount: 0, count: 0 }
              }
              projectMap[bill.project].amount += bill.amount
              projectMap[bill.project].count += 1
            }
          } else {
            dailyExpense += bill.amount
          }
        }
      })

      const dailyBudget = this.data.dailyBudget
      let dailyBudgetStatus = ''
      if (dailyBudget > 0) {
        dailyBudgetStatus = dailyExpense <= dailyBudget ? '基线内' : '超基线'
      }

      const extraProjects = Object.values(projectMap).sort((a, b) => b.amount - a.amount)
      const recentBills = bills.slice(0, 10)

      this.setData({
        totalExpense: dailyExpense + extraExpense,
        dailyExpense,
        extraExpense,
        dailyBudgetStatus,
        extraProjects,
        recentBills,
        loading: false
      })
      wx.hideLoading()
    }).catch(err => {
      console.error(err)
      wx.hideLoading()
      this.setData({ loading: false })
    })
  },

  onPrevMonth() {
    let { year, month } = this.data
    month -= 1
    if (month < 1) { month = 12; year -= 1 }
    this.setData({
      year, month,
      currentMonth: `${year}-${String(month).padStart(2, '0')}`
    })
    this.loadMonthData()
  },

  onNextMonth() {
    let { year, month } = this.data
    month += 1
    if (month > 12) { month = 1; year += 1 }
    this.setData({
      year, month,
      currentMonth: `${year}-${String(month).padStart(2, '0')}`
    })
    this.loadMonthData()
  },

  onBillTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/bill-edit/bill-edit?id=${id}` })
  },

  onProjectTap(e) {
    const name = e.currentTarget.dataset.name
    wx.navigateTo({ url: `/pages/project/project?name=${name}` })
  }
})

const { formatMonth } = require('../../utils/util')
const db = require('../../utils/db')

Page({
  data: {
    currentMonth: '',
    year: 0,
    month: 0,
    activeTab: 'overview',
    tabs: ['总览', 'TOP支出', '趋势', '对比'],
    categoryData: [],
    topExpenses: [],
    dailyTrend: [],
    monthlyCompare: [],
    totalExpense: 0,
    dailyExpense: 0,
    extraExpense: 0
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
    this.loadReportData()
  },

  loadReportData() {
    const { year, month } = this.data
    db.getBillsByMonth('default', year, month).then(res => {
      const bills = res.data.filter(b => b.type === 'expense')
      this.processData(bills)
    }).catch(err => {
      console.error(err)
    })
  },

  processData(bills) {
    let dailyExpense = 0
    let extraExpense = 0
    const categoryMap = {}
    const topMap = {}

    bills.forEach(bill => {
      const amount = bill.amount
      if (bill.level === 'extra') {
        extraExpense += amount
      } else {
        dailyExpense += amount
      }

      if (!categoryMap[bill.category]) {
        categoryMap[bill.category] = 0
      }
      categoryMap[bill.category] += amount

      if (!topMap[bill.merchant]) {
        topMap[bill.merchant] = { merchant: bill.merchant, amount: 0, count: 0 }
      }
      topMap[bill.merchant].amount += amount
      topMap[bill.merchant].count += 1
    })

    const totalExpense = dailyExpense + extraExpense

    const categoryData = Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        percent: totalExpense > 0 ? Math.round(value / totalExpense * 100) : 0
      }))
      .sort((a, b) => b.value - a.value)

    const topExpenses = Object.values(topMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    this.setData({
      totalExpense,
      dailyExpense,
      extraExpense,
      categoryData,
      topExpenses
    })
  },

  onTabChange(e) {
    const tabs = ['overview', 'top', 'trend', 'compare']
    const index = e.currentTarget.dataset.index
    this.setData({ activeTab: tabs[index] })
  },

  onPrevMonth() {
    let { year, month } = this.data
    month -= 1
    if (month < 1) { month = 12; year -= 1 }
    this.setData({
      year, month,
      currentMonth: `${year}-${String(month).padStart(2, '0')}`
    })
    this.loadReportData()
  },

  onNextMonth() {
    let { year, month } = this.data
    month += 1
    if (month > 12) { month = 1; year += 1 }
    this.setData({
      year, month,
      currentMonth: `${year}-${String(month).padStart(2, '0')}`
    })
    this.loadReportData()
  }
})

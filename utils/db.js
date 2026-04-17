const { generateId } = require('./util')

const getCollection = name => {
  try {
    const data = wx.getStorageSync(name)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

const saveCollection = (name, data) => {
  wx.setStorageSync(name, JSON.stringify(data))
}

const addBill = bill => {
  const bills = getCollection('bills')
  bill._id = generateId()
  bills.push(bill)
  saveCollection('bills', bills)
  return Promise.resolve({ _id: bill._id })
}

const batchAddBills = newBills => {
  const bills = getCollection('bills')
  newBills.forEach(bill => {
    bill._id = generateId()
    bills.push(bill)
  })
  saveCollection('bills', bills)
  return Promise.resolve(newBills.map(b => ({ _id: b._id })))
}

const updateBill = (id, data) => {
  const bills = getCollection('bills')
  const index = bills.findIndex(b => b._id === id)
  if (index >= 0) {
    Object.assign(bills[index], data, { updated: new Date() })
    saveCollection('bills', bills)
  }
  return Promise.resolve({ stats: { updated: index >= 0 ? 1 : 0 } })
}

const deleteBill = id => {
  let bills = getCollection('bills')
  bills = bills.filter(b => b._id !== id)
  saveCollection('bills', bills)
  return Promise.resolve({ stats: { removed: 1 } })
}

const getBillsByMonth = (userId, year, month) => {
  const bills = getCollection('bills')
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)
  const filtered = bills.filter(b => {
    if (b.user_id !== userId) return false
    const billDate = new Date(b.date)
    return billDate >= startDate && billDate < endDate
  })
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
  return Promise.resolve({ data: filtered })
}

const getBillsByProject = (userId, projectName) => {
  const bills = getCollection('bills')
  const filtered = bills.filter(b => b.user_id === userId && b.project === projectName)
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
  return Promise.resolve({ data: filtered })
}

const applyStrategy = (userId, conditions, actions) => {
  const bills = getCollection('bills')
  let matched = bills.filter(b => b.user_id !== userId ? false : true)

  if (conditions.date_from) {
    const from = new Date(conditions.date_from)
    matched = matched.filter(b => new Date(b.date) >= from)
  }
  if (conditions.date_to) {
    const to = new Date(conditions.date_to)
    matched = matched.filter(b => new Date(b.date) <= to)
  }
  if (conditions.category) {
    matched = matched.filter(b => b.category === conditions.category)
  }
  if (conditions.merchant_keyword) {
    const kw = conditions.merchant_keyword.toLowerCase()
    matched = matched.filter(b => b.merchant && b.merchant.toLowerCase().includes(kw))
  }
  if (conditions.amount_min) {
    matched = matched.filter(b => b.amount >= conditions.amount_min)
  }
  if (conditions.amount_max) {
    matched = matched.filter(b => b.amount <= conditions.amount_max)
  }

  matched.forEach(bill => {
    if (actions.add_tags && actions.add_tags.length) {
      bill.tags = [...new Set([...(bill.tags || []), ...actions.add_tags])]
    }
    if (actions.set_project) bill.project = actions.set_project
    if (actions.set_level) bill.level = actions.set_level
    bill.updated = new Date()
  })

  saveCollection('bills', bills)
  return Promise.resolve(matched.length)
}

const addProject = project => {
  const projects = getCollection('projects')
  project._id = generateId()
  projects.push(project)
  saveCollection('projects', projects)
  return Promise.resolve({ _id: project._id })
}

const getActiveProjects = userId => {
  const projects = getCollection('projects')
  const filtered = projects.filter(p => p.user_id === userId && p.status === 'active')
  filtered.sort((a, b) => new Date(b.start) - new Date(a.start))
  return Promise.resolve({ data: filtered })
}

const getAllProjects = userId => {
  const projects = getCollection('projects')
  const filtered = projects.filter(p => p.user_id === userId)
  filtered.sort((a, b) => new Date(b.start) - new Date(a.start))
  return Promise.resolve({ data: filtered })
}

const updateProject = (id, data) => {
  const projects = getCollection('projects')
  const index = projects.findIndex(p => p._id === id)
  if (index >= 0) {
    Object.assign(projects[index], data, { updated: new Date() })
    saveCollection('projects', projects)
  }
  return Promise.resolve({ stats: { updated: index >= 0 ? 1 : 0 } })
}

const deleteProject = id => {
  let projects = getCollection('projects')
  projects = projects.filter(p => p._id !== id)
  saveCollection('projects', projects)
  return Promise.resolve({ stats: { removed: 1 } })
}

const saveStrategy = strategy => {
  const strategies = getCollection('strategies')
  strategy._id = generateId()
  strategies.push(strategy)
  saveCollection('strategies', strategies)
  return Promise.resolve({ _id: strategy._id })
}

const getStrategyTemplates = userId => {
  const strategies = getCollection('strategies')
  const filtered = strategies.filter(s => s.user_id === userId && s.is_template)
  return Promise.resolve({ data: filtered })
}

const getUserConfig = userId => {
  try {
    const config = wx.getStorageSync('user_config')
    if (config) {
      const parsed = JSON.parse(config)
      return Promise.resolve({ data: [parsed] })
    }
  } catch {}
  return Promise.resolve({ data: [] })
}

const setUserConfig = (userId, config) => {
  try {
    const existing = wx.getStorageSync('user_config')
    let merged = {}
    if (existing) {
      merged = JSON.parse(existing)
    }
    Object.assign(merged, config, { user_id: userId, updated: new Date() })
    wx.setStorageSync('user_config', JSON.stringify(merged))
    return Promise.resolve({ stats: { updated: 1 } })
  } catch {
    const data = { user_id: userId, ...config, updated: new Date() }
    wx.setStorageSync('user_config', JSON.stringify(data))
    return Promise.resolve({ stats: { updated: 1 } })
  }
}

module.exports = {
  addBill,
  batchAddBills,
  updateBill,
  deleteBill,
  getBillsByMonth,
  getBillsByProject,
  applyStrategy,
  addProject,
  getActiveProjects,
  getAllProjects,
  updateProject,
  deleteProject,
  saveStrategy,
  getStrategyTemplates,
  getUserConfig,
  setUserConfig
}

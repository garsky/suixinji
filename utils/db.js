const db = wx.cloud.database()
const _ = db.command

const addBill = bill => {
  return db.collection('bills').add({ data: bill })
}

const batchAddBills = newBills => {
  const tasks = newBills.map(bill => db.collection('bills').add({ data: bill }))
  return Promise.all(tasks)
}

const updateBill = (id, data) => {
  return db.collection('bills').doc(id).update({
    data: { ...data, updated: new Date() }
  })
}

const deleteBill = id => {
  return db.collection('bills').doc(id).remove()
}

const getBillsByMonth = (userId, year, month) => {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)
  return db.collection('bills').where({
    user_id: userId,
    date: _.gte(startDate).and(_.lt(endDate))
  }).orderBy('date', 'desc').get()
}

const getBillsByProject = (userId, projectName) => {
  return db.collection('bills').where({
    user_id: userId,
    project: projectName
  }).orderBy('date', 'desc').get()
}

const applyStrategy = (userId, conditions, actions) => {
  let query = { user_id: userId }

  if (conditions.date_from || conditions.date_to) {
    query.date = {}
    if (conditions.date_from && conditions.date_to) {
      query.date = _.gte(new Date(conditions.date_from)).and(_.lte(new Date(conditions.date_to)))
    } else if (conditions.date_from) {
      query.date = _.gte(new Date(conditions.date_from))
    } else {
      query.date = _.lte(new Date(conditions.date_to))
    }
  }
  if (conditions.category) query.category = conditions.category
  if (conditions.merchant_keyword) {
    query.merchant = db.RegExp({ regexp: conditions.merchant_keyword, options: 'i' })
  }
  if (conditions.amount_min || conditions.amount_max) {
    query.amount = {}
    if (conditions.amount_min && conditions.amount_max) {
      query.amount = _.gte(conditions.amount_min).and(_.lte(conditions.amount_max))
    } else if (conditions.amount_min) {
      query.amount = _.gte(conditions.amount_min)
    } else {
      query.amount = _.lte(conditions.amount_max)
    }
  }

  return db.collection('bills').where(query).get().then(res => {
    const updateData = {}
    if (actions.add_tags && actions.add_tags.length) {
      updateData.tags = _.push(actions.add_tags)
    }
    if (actions.set_project) updateData.project = actions.set_project
    if (actions.set_level) updateData.level = actions.set_level
    updateData.updated = new Date()

    const tasks = res.data.map(bill =>
      db.collection('bills').doc(bill._id).update({ data: updateData })
    )
    return Promise.all(tasks).then(() => res.data.length)
  })
}

const addProject = project => {
  return db.collection('projects').add({ data: project })
}

const getActiveProjects = userId => {
  return db.collection('projects').where({
    user_id: userId,
    status: 'active'
  }).orderBy('start', 'desc').get()
}

const getAllProjects = userId => {
  return db.collection('projects').where({
    user_id: userId
  }).orderBy('start', 'desc').get()
}

const updateProject = (id, data) => {
  return db.collection('projects').doc(id).update({
    data: { ...data, updated: new Date() }
  })
}

const deleteProject = id => {
  return db.collection('projects').doc(id).remove()
}

const saveStrategy = strategy => {
  return db.collection('strategies').add({ data: strategy })
}

const getStrategyTemplates = userId => {
  return db.collection('strategies').where({
    user_id: userId,
    is_template: true
  }).get()
}

const getUserConfig = userId => {
  return db.collection('user_config').where({ user_id: userId }).get()
}

const setUserConfig = (userId, config) => {
  return db.collection('user_config').where({ user_id: userId }).get().then(res => {
    if (res.data.length > 0) {
      return db.collection('user_config').doc(res.data[0]._id).update({
        data: { ...config, updated: new Date() }
      })
    } else {
      return db.collection('user_config').add({
        data: { user_id: userId, ...config, created: new Date(), updated: new Date() }
      })
    }
  })
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

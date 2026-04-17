const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { action, data } = event

  switch (action) {
    case 'batchAdd':
      return await batchAddBills(data)
    case 'applyStrategy':
      return await applyStrategy(data)
    default:
      return { code: 400, message: 'unknown action' }
  }
}

async function batchAddBills(bills) {
  const db = cloud.database()
  const tasks = bills.map(bill => db.collection('bills').add({ data: bill }))
  try {
    const results = await Promise.all(tasks)
    return { code: 0, data: results }
  } catch (err) {
    return { code: 500, message: err.message }
  }
}

async function applyStrategy({ userId, conditions, actions }) {
  const db = cloud.database()
  const _ = db.command

  let query = { user_id: userId }

  if (conditions.date_from || conditions.date_to) {
    query.date = {}
    if (conditions.date_from) query.date = _.gte(new Date(conditions.date_from))
    if (conditions.date_to) {
      query.date = conditions.date_from
        ? _.gte(new Date(conditions.date_from)).and(_.lte(new Date(conditions.date_to)))
        : _.lte(new Date(conditions.date_to))
    }
  }
  if (conditions.category) query.category = conditions.category
  if (conditions.merchant_keyword) {
    query.merchant = db.RegExp({ regexp: conditions.merchant_keyword, options: 'i' })
  }
  if (conditions.amount_min || conditions.amount_max) {
    query.amount = {}
    if (conditions.amount_min) query.amount = _.gte(conditions.amount_min)
    if (conditions.amount_max) {
      query.amount = conditions.amount_min
        ? _.gte(conditions.amount_min).and(_.lte(conditions.amount_max))
        : _.lte(conditions.amount_max)
    }
  }

  try {
    const { data: bills } = await db.collection('bills').where(query).get()

    const updateData = {}
    if (actions.add_tags && actions.add_tags.length) {
      updateData.tags = _.push(actions.add_tags)
    }
    if (actions.set_project) updateData.project = actions.set_project
    if (actions.set_level) updateData.level = actions.set_level
    updateData.updated = new Date()

    const tasks = bills.map(bill =>
      db.collection('bills').doc(bill._id).update({ data: updateData })
    )
    await Promise.all(tasks)

    return { code: 0, data: { matched: bills.length } }
  } catch (err) {
    return { code: 500, message: err.message }
  }
}

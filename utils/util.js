const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${padZero(month)}-${padZero(day)}`
}

const formatMonth = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return `${year}-${padZero(month)}`
}

const padZero = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

const parseAmount = str => {
  if (typeof str === 'number') return str
  const num = parseFloat(str.replace(/[^0-9.-]/g, ''))
  return isNaN(num) ? 0 : num
}

const formatAmount = num => {
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

module.exports = {
  formatTime,
  formatMonth,
  padZero,
  generateId,
  parseAmount,
  formatAmount
}

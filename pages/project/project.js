const { formatTime } = require('../../utils/util')
const db = require('../../utils/db')

Page({
  data: {
    activeProjects: [],
    closedProjects: [],
    showCreate: false,
    showDetail: false,
    newProject: {
      name: '',
      type: 'time',
      budget: '',
      start: '',
      end: '',
      keyword: ''
    },
    currentProject: null,
    projectBills: [],
    totalAmount: 0
  },

  onShow() {
    this.loadProjects()
  },

  loadProjects() {
    db.getActiveProjects('default').then(res => {
      this.setData({ activeProjects: res.data })
    }).catch(err => console.error(err))

    db.getAllProjects('default').then(res => {
      const closed = res.data.filter(p => p.status === 'closed')
      this.setData({ closedProjects: closed })
    }).catch(err => console.error(err))
  },

  onShowCreate() {
    const now = formatTime(new Date())
    this.setData({
      showCreate: true,
      newProject: { name: '', type: 'time', budget: '', start: now, end: '', keyword: '' }
    })
  },

  onHideCreate() {
    this.setData({ showCreate: false })
  },

  onCreateFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value || e.detail
    const newProject = { ...this.data.newProject }
    newProject[field] = value
    this.setData({ newProject })
  },

  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ 'newProject.type': type })
  },

  onCreateProject() {
    const { newProject } = this.data
    if (!newProject.name) {
      wx.showToast({ title: '请输入项目名', icon: 'none' })
      return
    }

    if (newProject.type === 'keyword' && !newProject.keyword) {
      wx.showToast({ title: '请输入匹配关键词', icon: 'none' })
      return
    }

    const projectData = {
      user_id: 'default',
      name: newProject.name,
      type: newProject.type,
      budget: parseFloat(newProject.budget) || 0,
      start: newProject.type === 'time' ? new Date(newProject.start || Date.now()) : null,
      end: newProject.type === 'time' && newProject.end ? new Date(newProject.end) : null,
      keyword: newProject.type === 'keyword' ? newProject.keyword : null,
      status: 'active',
      created: new Date(),
      updated: new Date()
    }

    db.addProject(projectData).then(() => {
      wx.showToast({ title: '创建成功', icon: 'success' })
      this.setData({ showCreate: false })
      this.loadProjects()
    }).catch(() => {
      wx.showToast({ title: '创建失败', icon: 'none' })
    })
  },

  onProjectTap(e) {
    const { id } = e.currentTarget.dataset
    const project = this.data.activeProjects.find(p => p._id === id) ||
                    this.data.closedProjects.find(p => p._id === id)
    if (!project) return

    this.setData({ currentProject: project, showDetail: true })

    db.getBillsByProject('default', project.name).then(res => {
      const bills = res.data
      const totalAmount = bills.reduce((sum, b) => sum + (b.type === 'expense' ? b.amount : 0), 0)
      this.setData({ projectBills: bills, totalAmount })
    }).catch(err => console.error(err))
  },

  onHideDetail() {
    this.setData({ showDetail: false, currentProject: null, projectBills: [] })
  },

  onBillTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ showDetail: false })
    wx.navigateTo({ url: `/pages/bill-edit/bill-edit?id=${id}` })
  },

  onCloseProject() {
    const { currentProject } = this.data
    wx.showModal({
      title: '确认关闭',
      content: `关闭项目"${currentProject.name}"后将不再显示在活跃列表中`,
      success: res => {
        if (res.confirm) {
          db.updateProject(currentProject._id, { status: 'closed', updated: new Date() }).then(() => {
            wx.showToast({ title: '已关闭', icon: 'success' })
            this.setData({ showDetail: false })
            this.loadProjects()
          })
        }
      }
    })
  },

  onDeleteProject() {
    const { currentProject } = this.data
    wx.showModal({
      title: '确认删除',
      content: `删除项目"${currentProject.name}"？关联账单不会被删除`,
      success: res => {
        if (res.confirm) {
          db.deleteProject(currentProject._id).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.setData({ showDetail: false })
            this.loadProjects()
          })
        }
      }
    })
  }
})

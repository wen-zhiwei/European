const { ProgressStore, createWxStorage } = require('../../utils/progress');
const { REGIONS, buildGeography } = require('../../utils/geography');

const VIEW_TABS = [
  { id: 'world', label: '看世界' },
  { id: 'overview', label: '认识欧洲' },
  { id: 'trip', label: '看英法' }
];

const REGION_TABS = [
  { id: 'overview', label: '概览' },
  ...REGIONS.map(region => ({
    id: region.id,
    label: region.id === 'related' ? '延伸' : region.id === 'disputed' ? '争议' : region.name
  }))
];

Page({
  data: {
    screen: 'home',
    step: 0,
    completed: false,
    startLabel: '开始今天的学习',
    notice: '',
    geoView: 'overview',
    geoRegion: 'overview',
    geoCountry: null,
    viewTabs: VIEW_TABS,
    regionTabs: REGION_TABS,
    mainRegions: REGIONS.filter(region => !['related', 'disputed'].includes(region.id)),
    currentRegion: null,
    selectedCountry: null,
    countryButtons: [],
    markers: [],
    mapHeight: 343,
    imageStyle: '',
    isWorldView: false,
    isTripView: false,
    isOverview: true,
    showSource: false,
    showGeographyInfo: false,
    recording: false,
    recordPath: '',
    recordStatus: '录音不上传，离页即清除',
    recorderSupported: true
  },

  onLoad() {
    const app = getApp();
    this.store = new ProgressStore(createWxStorage(wx), app.globalData.learnerId);
    this.setupRecorder();
    this.readProgress();
    this.refreshGeography();
  },

  onHide() {
    if (this.data.recording) this.stopAndDiscardRecording();
  },

  onUnload() {
    this.stopAndDiscardRecording();
    if (this.audioContext) {
      this.audioContext.destroy();
      this.audioContext = null;
    }
  },

  readProgress() {
    const state = this.store.read();
    this.setData({
      step: state.step,
      completed: state.completed,
      startLabel: state.completed ? '再看一遍' : state.step > 0 ? '接着上次学' : '开始今天的学习',
      notice: this.store.warning
    });
  },

  save(action) {
    try {
      const state = action();
      this.setData({
        step: state.step,
        completed: state.completed,
        notice: '',
        startLabel: state.completed ? '再看一遍' : state.step > 0 ? '接着上次学' : '开始今天的学习'
      });
      return true;
    } catch (error) {
      this.setData({ notice: '学习记录没有保存成功，请稍后再试。' });
      wx.showToast({ title: '进度未保存', icon: 'none' });
      return false;
    }
  },

  startLesson() {
    if (this.data.completed && !this.save(() => this.store.saveStep(0))) return;
    this.setData({ screen: 'lesson' });
  },

  goHome() {
    this.stopAndDiscardRecording();
    this.setData({ screen: 'home' });
  },

  nextStep() {
    if (this.save(() => this.store.saveStep(1))) {
      this.setData({ screen: 'lesson' });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
  },

  previousStep() {
    if (this.save(() => this.store.saveStep(0))) {
      this.stopAndDiscardRecording();
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
  },

  completeLesson() {
    if (this.save(() => this.store.complete())) {
      this.stopAndDiscardRecording();
      this.setData({ screen: 'completed' });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
  },

  reviewLesson() {
    if (this.save(() => this.store.saveStep(0))) {
      this.setData({ screen: 'lesson' });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
  },

  changeView(event) {
    const view = event.currentTarget.dataset.view;
    if (!VIEW_TABS.some(item => item.id === view)) return;
    this.setData({ geoView: view, geoCountry: null }, () => this.refreshGeography());
  },

  changeRegion(event) {
    const region = event.currentTarget.dataset.region;
    if (region !== 'overview' && !REGIONS.some(item => item.id === region)) return;
    this.setData({ geoView: 'overview', geoRegion: region, geoCountry: null }, () => {
      this.refreshGeography();
      wx.pageScrollTo({ scrollTop: 180, duration: 200 });
    });
  },

  selectCountry(event) {
    const country = event.currentTarget.dataset.country;
    if (!this.data.currentRegion || !this.data.currentRegion.countries.some(item => item.id === country)) return;
    this.setData({ geoCountry: country }, () => {
      this.refreshGeography();
      wx.pageScrollTo({ scrollTop: 220, duration: 200 });
    });
  },

  refreshGeography() {
    const geo = buildGeography(this.data.geoView, this.data.geoRegion, this.data.geoCountry);
    this.setData({
      currentRegion: geo.region,
      selectedCountry: geo.selected,
      countryButtons: geo.countryButtons,
      markers: geo.markers,
      mapHeight: geo.mapHeight,
      imageStyle: geo.imageStyle,
      isWorldView: this.data.geoView === 'world',
      isTripView: this.data.geoView === 'trip',
      isOverview: this.data.geoView === 'overview' && !geo.region
    });
  },

  openSource() {
    this.setData({ showSource: true });
  },

  closeSource() {
    this.setData({ showSource: false });
  },

  openGeographyInfo() {
    this.setData({ showGeographyInfo: true });
  },

  closeGeographyInfo() {
    this.setData({ showGeographyInfo: false });
  },

  stopBubble() {},

  setupRecorder() {
    if (!wx.getRecorderManager) {
      this.setData({ recorderSupported: false, recordStatus: '当前设备不支持录音' });
      return;
    }
    this.recorderManager = wx.getRecorderManager();
    this.recorderManager.onStart(() => {
      this.discardNextRecording = false;
      this.setData({ recording: true, recordStatus: '正在录音 · 最长 30 秒' });
    });
    this.recorderManager.onStop(result => {
      const discard = this.discardNextRecording;
      this.discardNextRecording = false;
      this.setData(discard ? {
        recording: false,
        recordPath: '',
        recordStatus: '录音不上传，离页即清除'
      } : {
        recording: false,
        recordPath: result.tempFilePath || '',
        recordStatus: result.tempFilePath ? '录好了' : '没有录到声音，请再试一次'
      });
    });
    this.recorderManager.onError(() => {
      this.discardNextRecording = false;
      this.setData({ recording: false, recordPath: '', recordStatus: '暂时无法录音，可以直接完成本课' });
      wx.showToast({ title: '录音没有成功', icon: 'none' });
    });
  },

  toggleRecording() {
    if (!this.recorderManager) {
      wx.showToast({ title: '当前设备不支持录音', icon: 'none' });
      return;
    }
    if (this.data.recording) {
      this.recorderManager.stop();
      return;
    }
    wx.getSetting({
      success: result => {
        if (result.authSetting['scope.record'] === false) {
          wx.showModal({
            title: '需要麦克风权限',
            content: '打开设置后，允许使用麦克风。',
            confirmText: '去设置',
            success: modal => {
              if (modal.confirm) wx.openSetting();
            }
          });
          return;
        }
        this.startRecording();
      },
      fail: () => this.startRecording()
    });
  },

  startRecording() {
    this.setData({ recordPath: '', recordStatus: '正在申请麦克风权限…' });
    this.recorderManager.start({
      duration: 30000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 64000,
      format: 'mp3'
    });
  },

  stopAndDiscardRecording() {
    if (!this.recorderManager) return;
    if (this.data.recording) {
      this.discardNextRecording = true;
      this.recorderManager.stop();
    } else {
      this.setData({ recordPath: '', recordStatus: '录音不上传，离页即清除' });
    }
  },

  playRecording() {
    if (!this.data.recordPath) return;
    if (this.audioContext) this.audioContext.destroy();
    this.audioContext = wx.createInnerAudioContext();
    this.audioContext.src = this.data.recordPath;
    this.audioContext.onPlay(() => this.setData({ recordStatus: '正在回放' }));
    this.audioContext.onEnded(() => this.setData({ recordStatus: '录好了' }));
    this.audioContext.onError(() => {
      this.setData({ recordStatus: '暂时无法回放，请重新录一次' });
      wx.showToast({ title: '回放失败', icon: 'none' });
    });
    this.audioContext.play();
  }
});

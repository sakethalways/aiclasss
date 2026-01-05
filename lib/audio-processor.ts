// Audio processing for noise filtering using Web Audio API
export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private isProcessing = false

  async initialize(stream: MediaStream): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048

    const source = this.audioContext.createMediaStreamSource(stream)

    // Create a filter for noise reduction
    const highPassFilter = this.audioContext.createBiquadFilter()
    highPassFilter.type = "highpass"
    highPassFilter.frequency.value = 300 // Filter out frequencies below 300Hz (rumble, traffic noise)

    // Create a compressor to manage dynamic range
    const compressor = this.audioContext.createDynamicsCompressor()
    compressor.threshold.value = -50
    compressor.knee.value = 40
    compressor.ratio.value = 12
    compressor.attack.value = 0.003
    compressor.release.value = 0.25

    source.connect(highPassFilter)
    highPassFilter.connect(compressor)
    compressor.connect(this.analyser)

    this.mediaStream = stream
    this.isProcessing = true
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(0)
    }
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(dataArray)
    return dataArray
  }

  getAverageFrequency(): number {
    if (!this.analyser) return 0
    const dataArray = this.getFrequencyData()
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    return average
  }

  stop(): void {
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close()
    }
    this.isProcessing = false
    this.audioContext = null
  }
}

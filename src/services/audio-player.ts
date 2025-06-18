export class AudioPlayer {
  private audioContext: AudioContext | null = null
  private audioQueue: AudioBuffer[] = []
  private isPlaying = false
  private currentSource: AudioBufferSourceNode | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log('✅ AudioContext created successfully, state:', this.audioContext.state)
      } catch (error) {
        console.error('❌ Failed to create AudioContext:', error)
      }
    }
  }

  async playBase64Audio(base64Audio: string) {
    // Try to create audio context if it doesn't exist
    if (!this.audioContext && typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log('✅ AudioContext created on demand, state:', this.audioContext.state)
      } catch (error) {
        console.error('❌ Failed to create AudioContext on demand:', error)
        return
      }
    }

    if (!this.audioContext) {
      console.error('❌ No audio context available!')
      return
    }

    console.log('🎵 AudioPlayer: Received audio, length:', base64Audio.length)

    try {
      // Resume audio context if it's suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        console.log('🔄 Resuming suspended audio context...')
        await this.audioContext.resume()
        console.log('✅ Audio context resumed, state:', this.audioContext.state)
      }

      // Decode base64 to array buffer
      const binaryString = atob(base64Audio)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      console.log('🎵 Decoded audio bytes:', bytes.length)

      // Convert PCM16 to AudioBuffer
      const audioBuffer = await this.pcm16ToAudioBuffer(bytes.buffer)
      
      console.log('🎵 Created audio buffer:', {
        duration: audioBuffer.duration,
        length: audioBuffer.length,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels
      })
      
      // Add to queue and play
      this.audioQueue.push(audioBuffer)
      console.log('🎵 Audio queue length:', this.audioQueue.length)
      
      if (!this.isPlaying) {
        console.log('▶️ Starting playback...')
        this.playNext()
      } else {
        console.log('⏸️ Already playing, added to queue')
      }
    } catch (error) {
      console.error('❌ Failed to play audio:', error)
    }
  }

  private async pcm16ToAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('No audio context')

    const dataView = new DataView(arrayBuffer)
    const length = dataView.byteLength / 2
    const floatArray = new Float32Array(length)

    // Convert PCM16 to float
    for (let i = 0; i < length; i++) {
      const sample = dataView.getInt16(i * 2, true) // little-endian
      floatArray[i] = sample / 32768.0
    }

    // Create audio buffer with 24kHz sample rate (matching the API)
    const audioBuffer = this.audioContext.createBuffer(1, length, 24000)
    audioBuffer.getChannelData(0).set(floatArray)

    return audioBuffer
  }

  private playNext() {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false
      console.log('⏹️ Playback stopped, queue empty')
      return
    }

    this.isPlaying = true
    const audioBuffer = this.audioQueue.shift()!
    
    console.log('▶️ Playing audio buffer:', {
      duration: audioBuffer.duration,
      queueRemaining: this.audioQueue.length
    })

    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.audioContext.destination)
    
    source.onended = () => {
      console.log('✅ Audio buffer finished playing')
      this.currentSource = null
      this.playNext()
    }

    this.currentSource = source
    source.start()
  }

  stop() {
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
    this.audioQueue = []
    this.isPlaying = false
  }

  cleanup() {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
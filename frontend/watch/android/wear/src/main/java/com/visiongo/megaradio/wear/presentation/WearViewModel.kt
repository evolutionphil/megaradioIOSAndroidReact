// WearViewModel.kt
// ViewModel that bridges PhoneConnectivityService and the Compose UI

package com.visiongo.megaradio.wear.presentation

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.visiongo.megaradio.wear.data.PhoneConnectivityService
import com.visiongo.megaradio.wear.data.Station
import com.visiongo.megaradio.wear.data.WearDataRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class WearViewModel(application: Application) : AndroidViewModel(application) {

    private val phoneService = PhoneConnectivityService(application)

    // Expose repository flows
    val stations: StateFlow<List<Station>> = WearDataRepository.stations
    val favorites = WearDataRepository.favorites
    val genres = WearDataRepository.genres
    val countries = WearDataRepository.countries
    val nowPlaying = WearDataRepository.nowPlaying
    val isPlaying = WearDataRepository.isPlaying
    val songTitle = WearDataRepository.songTitle
    val artistName = WearDataRepository.artistName
    val isPhoneConnected = WearDataRepository.isPhoneConnected

    // Loading state for genre/country station requests
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    // Genre/country specific stations (filtered view)
    private val _filteredStations = MutableStateFlow<List<Station>>(emptyList())
    val filteredStations: StateFlow<List<Station>> = _filteredStations

    init {
        // Check connection and request initial data
        viewModelScope.launch {
            val connected = phoneService.checkPhoneConnection()
            if (connected) {
                phoneService.requestAllData()
            }
        }

        // Periodically check phone connection
        viewModelScope.launch {
            while (true) {
                delay(15_000) // every 15 seconds
                phoneService.checkPhoneConnection()
            }
        }
    }

    fun playStation(station: Station) {
        viewModelScope.launch {
            phoneService.sendPlayCommand(station.id)
        }
    }

    fun togglePlayPause() {
        viewModelScope.launch {
            if (isPlaying.value) {
                phoneService.sendPauseCommand()
            } else {
                phoneService.sendResumeCommand()
            }
        }
    }

    fun nextStation() {
        viewModelScope.launch {
            phoneService.sendNextCommand()
        }
    }

    fun previousStation() {
        viewModelScope.launch {
            phoneService.sendPreviousCommand()
        }
    }

    fun toggleFavorite(stationId: String) {
        viewModelScope.launch {
            phoneService.sendToggleFavorite(stationId)
        }
    }

    fun requestStationsByGenre(genreId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _filteredStations.value = emptyList()
            phoneService.requestStationsByGenre(genreId)
            // Wait for data to arrive via DataLayer, with timeout
            delay(3000)
            _filteredStations.value = stations.value
            _isLoading.value = false
        }
    }

    fun requestStationsByCountry(countryCode: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _filteredStations.value = emptyList()
            phoneService.requestStationsByCountry(countryCode)
            delay(3000)
            _filteredStations.value = stations.value
            _isLoading.value = false
        }
    }

    fun refreshData() {
        viewModelScope.launch {
            phoneService.requestAllData()
        }
    }
}

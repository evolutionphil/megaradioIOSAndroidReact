// WearViewModel.kt
// ViewModel that bridges PhoneConnectivityService and the Compose UI

package com.visiongo.megaradio.wear.presentation

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.visiongo.megaradio.wear.data.PhoneConnectivityService
import com.visiongo.megaradio.wear.data.Station
import com.visiongo.megaradio.wear.data.WearDataRepository
import com.visiongo.megaradio.wear.data.awaitStationResponse
import kotlinx.coroutines.Job
import java.util.UUID
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

    private var stationRequest: Job? = null
    private var connectionChecks: Job? = null
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        // Check connection and request initial data
        viewModelScope.launch {
            phoneService.loadCachedData()
            val connected = phoneService.checkPhoneConnection()
            if (connected) {
                phoneService.requestAllData()
            }
        }

    }

    fun startConnectionChecks() {
        refreshData()
        connectionChecks?.cancel()
        connectionChecks = viewModelScope.launch {
            while (true) {
                delay(15_000) // every 15 seconds
                val wasConnected = isPhoneConnected.value
                if (phoneService.checkPhoneConnection() && !wasConnected) phoneService.requestAllData()
            }
        }
    }

    fun stopConnectionChecks() { connectionChecks?.cancel() }

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

    fun requestStationsByGenre(genreId: String) = requestStations { id ->
        phoneService.requestStationsByGenre(genreId, id)
    }

    fun requestStationsByCountry(countryName: String) = requestStations { id ->
        phoneService.requestStationsByCountry(countryName, id)
    }

    private fun requestStations(send: suspend (String) -> Boolean) {
        stationRequest?.cancel()
        _isLoading.value = true
        _error.value = null
        _filteredStations.value = emptyList()
        stationRequest = viewModelScope.launch {
            val requestId = UUID.randomUUID().toString()
            if (!send(requestId)) {
                _error.value = "Open MegaRadio on your connected Android phone, then try again."
            } else {
                val response = awaitStationResponse(WearDataRepository.stationResponse, requestId)
                if (response == null) {
                    _error.value = "No response. Open or update MegaRadio on your phone, then try again."
                } else if (response.error != null) {
                    _error.value = "Stations could not be loaded. Please try again."
                } else {
                    _filteredStations.value = response.stations
                }
            }
            _isLoading.value = false
        }
    }

    fun refreshData() {
        viewModelScope.launch {
            phoneService.loadCachedData()
            if (phoneService.checkPhoneConnection()) phoneService.requestAllData()
        }
    }
}

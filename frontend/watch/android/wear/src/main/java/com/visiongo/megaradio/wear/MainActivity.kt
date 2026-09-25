// MainActivity.kt
// Main entry point for Wear OS app

package com.visiongo.megaradio.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.ViewModelProvider
import com.visiongo.megaradio.wear.presentation.WearViewModel
import com.visiongo.megaradio.wear.presentation.MegaRadioWearApp
import com.visiongo.megaradio.wear.presentation.theme.MegaRadioWearTheme

class MainActivity : ComponentActivity() {
    private lateinit var wearViewModel: WearViewModel
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        wearViewModel = ViewModelProvider(this)[WearViewModel::class.java]
        
        setContent {
            MegaRadioWearTheme {
                MegaRadioWearApp(wearViewModel)
            }
        }
    }

    override fun onStart() { super.onStart(); wearViewModel.startConnectionChecks() }
    override fun onStop() { wearViewModel.stopConnectionChecks(); super.onStop() }
}

// MainActivity.kt
// Main entry point for Wear OS app

package com.visiongo.megaradio.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.viewmodel.compose.viewModel
import com.visiongo.megaradio.wear.presentation.MegaRadioWearApp
import com.visiongo.megaradio.wear.presentation.theme.MegaRadioWearTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            MegaRadioWearTheme {
                MegaRadioWearApp()
            }
        }
    }
}

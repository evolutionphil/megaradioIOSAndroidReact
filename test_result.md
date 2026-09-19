#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Android crash stacktrace investigation + CarPlay never opens/crashes + general MOBILE functional code review/fixes. Turkish user confirmed priority; TV/Desktop must stay unchanged."
frontend:
  - task: "Android SoLoader native packaging mitigation"
    implemented: true
    working: NA
    file: "frontend/app.json; plugins/withAndroidBuildFix.js; android/gradle.properties"
    stuck_count: 0
    priority: high
    needs_retesting: true
    status_history:
      - agent: main
        working: NA
        comment: "Crash 1.0.69(91) libreactnative.so: nativeLibraryDir arm64 vs DirectApkSoSource x86_64; actual ABI/install cause unproven without APK/device. useLegacyPackaging true mitigation; keep all ABIs; bump versionCode92; removed obsolete dexOptions; preserve boot permission removal. Prebuild succeeded twice, not a native build."
  - task: "CarPlay cold start / scene generation / template lifecycle"
    implemented: true
    working: NA
    file: "frontend/plugins/withCarPlayScenes.js; plugins/ios/*.swift; src/services/carPlayService.ts; src/components/QuickActionsHandler.tsx"
    stuck_count: 0
    priority: high
    needs_retesting: true
    status_history:
      - agent: main
        working: NA
        comment: "Single retained main root via factory for CarPlay-first, real phone UIWindowScene attachment, native immediate loading root, forwarding URL/userActivity/shortcut, clean-prebuild scene source registration, app-wide newArchEnabled false (was inconsistent plist true). Missing megaradio URL scheme restored. Tab title/image moved into ListTemplate constructor config (previous assignments ignored); generation guards discard disconnect/reconnect stale fetches; replaced root listener cleanup. Verify actual native APIs via installed sources, cannot compile Swift here."
  - task: "Mobile nearby playback and common functional fixes"
    implemented: true
    working: NA
    file: "frontend/app/nearby-stations.tsx; src/components/StationCard.tsx; src/hooks/useWatchConnectivity.ts; src/services/carPlayImageCache.ts"
    stuck_count: 0
    priority: high
    needs_retesting: true
    status_history:
      - agent: main
        working: NA
        comment: "Nearby used undefined playerStore.play -> useAudioPlayer.playStation, zero coordinates accepted, refresh finally, native testIDs. StationCard large gradient undefined and play button inert fixed. Cache legacy FS API restored. Font duplicate keys removed in search/users/player/notifications. Watch unused hook repaired. No new APIs/mocks."
  - task: "Mobile web preview render"
    implemented: false
    working: false
    file: "frontend/app/_layout.tsx"
    stuck_count: 1
    priority: high
    needs_retesting: true
    status_history:
      - agent: main
        working: false
        comment: "Screenshot hangs at white Bundling... app/_layout.tsx despite bundle 200 (8.5MB,1s) and Watch/NativeCast/Onboarding logs. remoteLog CORS storm removed for web but NOT the primary root cause; 2 troubleshooter recommendations about sendLog were speculative. Need actual lazy route module/promise investigation. Do not modify protected metro/index main/env."
test_plan:
  current_focus: ["Android config + CarPlay native source generation", "CarPlay session race harness", "Nearby play handler", "Preview render blocker"]
  test_all: false
  test_priority: high_first
agent_communication:
  - agent: main
    message: "Run test harnesses plus native config generation checks in isolated temp copy for CLEAN prebuild (do not destroy checked-in ios/watch targets). Modified JS/plugin lint passed. Existing tsc mobile errors remain in old/inactive cast store/GlobalAudioPlayer and some type declarations. See /tmp/megaradio-tsc-before.log and after.log. Credentials in memory/test_credentials.md, do not change accounts."
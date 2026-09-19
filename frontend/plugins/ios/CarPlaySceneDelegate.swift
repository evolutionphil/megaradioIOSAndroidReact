import CarPlay
import UIKit

@objc public class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private weak var connectedController: CPInterfaceController?

    private func connect(_ controller: CPInterfaceController, window: CPWindow) {
        guard connectedController !== controller else { return }
        connectedController = controller
        // Audio-entitlement-safe root immediately, before JS or network work.
        let item = CPListItem(text: NSLocalizedString("Loading…", comment: "CarPlay startup"),
                              detailText: nil)
        item.isEnabled = false
        let loading = CPListTemplate(title: "MegaRadio", sections: [CPListSection(items: [item])])
        controller.setRootTemplate(loading, animated: false, completion: nil)
        RNCarPlay.connect(with: controller, window: window)
        DispatchQueue.main.async { [weak self, weak controller] in
            guard let controller = controller, self?.connectedController === controller else { return }
            MegaRadioSceneCoordinator.shared.startForCarPlay()
        }
    }

    public func templateApplicationScene(_ scene: CPTemplateApplicationScene,
                                          didConnect controller: CPInterfaceController) {
        connect(controller, window: scene.carWindow)
    }

    public func templateApplicationScene(_ scene: CPTemplateApplicationScene,
                                          didConnect controller: CPInterfaceController,
                                          to window: CPWindow) {
        connect(controller, window: window)
    }

    private func disconnect(_ controller: CPInterfaceController) {
        guard connectedController === controller else { return }
        connectedController = nil
        RNCarPlay.disconnect()
    }

    public func templateApplicationScene(_ scene: CPTemplateApplicationScene,
                                          didDisconnectInterfaceController controller: CPInterfaceController) {
        disconnect(controller)
    }

    public func templateApplicationScene(_ scene: CPTemplateApplicationScene,
                                          didDisconnect controller: CPInterfaceController,
                                          from window: CPWindow) {
        disconnect(controller)
    }

    public func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        MegaRadioSceneCoordinator.shared.forwardActivity(userActivity)
    }
}
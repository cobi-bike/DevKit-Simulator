
module.exports = {
    version: '0.34.0',
    // channel - properties
    mobile: {
        location: 'mobile/location'
    },
    hub: {
        externalInterfaceAction: 'hub/externalInterfaceAction',
        thumbControllerInterfaceId: 'hub/thumbControllerInterfaceId',
        bellRinging: 'hub/bellRinging'
    },
    app: {
        touchInteractionEnabled: 'app/touchInteractionEnabled'
    },
    navigationService: {
        status: 'navigationService/status',
        route: 'navigationService/route',
        control: 'navigationService/control',
        eta: 'navigationService/eta',
        distanceToDestination: 'navigationService/distanceToDestination'
    },
    devkit: {
        overrideThumbControllerMapping: 'devkit/overrideThumbControllerMapping'
    }
}

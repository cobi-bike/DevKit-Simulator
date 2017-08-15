// @flow

const spec = {
  version: '0.33.1',
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
    destinationLocation: 'navigationService/destinationLocation',
    eta: 'navigationService/eta',
    distanceToDestination: 'navigationService/distanceToDestination'
  }
}

module.exports = spec

export const handleRegister = (name, callback) => {
    if (!clientManager.isUserAvailable(name)) return callback('user is not available');

    const user = clientManager.getUserByName(name)
    clientManager.registerClient(client, user)

    return callback(null, user)
};
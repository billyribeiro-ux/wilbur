/// Parsed channel types for validation.
#[derive(Debug, Clone)]
pub enum Channel {
    RoomChat,
    RoomAlerts,
    RoomTracks,
    RoomPresence,
    RoomPolls,
    UserNotifications,
    DirectMessage,
}

impl Channel {
    /// Parse a channel string like "room:{uuid}:chat" into a typed Channel.
    pub fn parse(channel: &str) -> Option<Self> {
        let parts: Vec<&str> = channel.split(':').collect();
        match parts.as_slice() {
            ["room", _id, "chat"] => Some(Channel::RoomChat),
            ["room", _id, "alerts"] => Some(Channel::RoomAlerts),
            ["room", _id, "tracks"] => Some(Channel::RoomTracks),
            ["room", _id, "presence"] => Some(Channel::RoomPresence),
            ["room", _id, "polls"] => Some(Channel::RoomPolls),
            ["user", _id, "notifications"] => Some(Channel::UserNotifications),
            ["dm", _id] => Some(Channel::DirectMessage),
            _ => None,
        }
    }
}

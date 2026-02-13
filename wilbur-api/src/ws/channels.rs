use uuid::Uuid;

/// Parsed channel types with authorization requirements.
#[derive(Debug, Clone)]
pub enum Channel {
    RoomChat(Uuid),
    RoomAlerts(Uuid),
    RoomTracks(Uuid),
    RoomPresence(Uuid),
    RoomPolls(Uuid),
    UserNotifications(Uuid),
    DirectMessage(Uuid),
}

impl Channel {
    /// Parse a channel string like "room:{uuid}:chat" into a typed Channel.
    pub fn parse(channel: &str) -> Option<Self> {
        let parts: Vec<&str> = channel.split(':').collect();
        match parts.as_slice() {
            ["room", id, "chat"] => Uuid::parse_str(id).ok().map(Channel::RoomChat),
            ["room", id, "alerts"] => Uuid::parse_str(id).ok().map(Channel::RoomAlerts),
            ["room", id, "tracks"] => Uuid::parse_str(id).ok().map(Channel::RoomTracks),
            ["room", id, "presence"] => Uuid::parse_str(id).ok().map(Channel::RoomPresence),
            ["room", id, "polls"] => Uuid::parse_str(id).ok().map(Channel::RoomPolls),
            ["user", id, "notifications"] => {
                Uuid::parse_str(id).ok().map(Channel::UserNotifications)
            }
            ["dm", id] => Uuid::parse_str(id).ok().map(Channel::DirectMessage),
            _ => None,
        }
    }

    /// Get the room_id if this is a room-scoped channel.
    pub fn room_id(&self) -> Option<Uuid> {
        match self {
            Channel::RoomChat(id)
            | Channel::RoomAlerts(id)
            | Channel::RoomTracks(id)
            | Channel::RoomPresence(id)
            | Channel::RoomPolls(id) => Some(*id),
            _ => None,
        }
    }

    /// Get the user_id if this is a user-scoped channel.
    pub fn user_id(&self) -> Option<Uuid> {
        match self {
            Channel::UserNotifications(id) => Some(*id),
            _ => None,
        }
    }
}

import React, { Component } from 'react';
import styled from 'styled-components';
import { Typography, notification } from 'antd';

import {
    Container,
} from '../components';

const { Title } = Typography;

const StyledContainer = styled(Container)`
    text-align: center;
`

const SmallTitle = styled.small`
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 10px;
    display: block;
`;

const BigTrigger = styled.div`
    width: 100%;
    height: 300px;
    background-color: red;
    &:active,
    &.active {
        background-color: black;
    }
`;

const errorNotification = (message) => {
    notification.error({
        message,
    });
};

const infoNotification = (message) => {
    notification.info({ message });
};

class GameRoom extends Component {
    state = {
        roomName: this.props.match.params.roomId || '?',
        playerId: this.props.match.params.playerId || '?',
    }

    componentDidMount() {
        const playData = {
            roomName: this.state.roomName,
            playerId: this.state.playerId,
        };
        this.props.socket.emit('PLAYER_JOIN_ROOM', playData, this.joinCallback);
        window.addEventListener('beforeunload', () => {
            this.props.socket.emit('PLAYER_LEAVE_ROOM', playData);
        });
        this.props.socket.on('PING_REQUEST', () => {
            this.props.socket.emit('PONG', playData);
        });
        this.props.socket.on('ROOM_UPDATE', (newRoomData) => {
            this.setState({ ...newRoomData })
        });
    }
    componentDidUpdate() {
        console.log(this.state);
    }

    joinCallback = ({ status, roomName, errorMessage }) => {
        if (status === 'OK') {
            infoNotification(`Dołączono do pokoju ${roomName}!`)
        } else {
            this.props.history.push('/');
            errorNotification(errorMessage);
        }
    }

    shoot = () => {
        const playData = {
            roomName: this.state.roomName,
            playerId: this.state.playerId,
        };
        this.props.socket.emit('PLAYER_SHOT', playData);
    }

    render() {
        return (
            <StyledContainer>
                <Title level={3}>
                    <SmallTitle>grasz w pokoju</SmallTitle>
                    {this.state.roomName}
                    <BigTrigger
                        onClick={this.shoot}
                    />
                </Title>
            </StyledContainer>
        );
    }
}
export { GameRoom };
import React, { PureComponent } from 'react';
import styled from 'styled-components';
import { Button, Popover, notification } from 'antd';
import { getRoomName } from '../utils/name-generator';
import { Container } from '../components';

const ButtonGroup = Button.Group;

const NameContainer = styled.p`
    padding: 10px 20px;
    border: 1px solid #dedede;
    border-radius: 4px;
    display: block;
    margin: 10px auto 20px auto;
    width: fit-content;
`

const StyledContainer = styled(Container)`
    text-align: center;
`

const errorNotification = (description) => {
    notification.open({
        message: 'Wystąpił błąd',
        description,
    });
};

class Home extends PureComponent {
    state = {
        newRoomName: getRoomName(),
    }
    setNewRoomName = () => {
        this.setState({
            newRoomName: getRoomName(),
        })
    }
    joinRoom = () => {
        this.props.socket.emit('CREATE_ROOM', { roomName: this.state.newRoomName }, ({ status, errorMessage }) => {
            if (status === 'OK') {
                this.props.history.push(`/room/${this.state.newRoomName}`);
            } else {
                errorNotification(errorMessage);
            }
        });
    }
    render() {
        return (
            <StyledContainer>
                <NameContainer>{this.state.newRoomName}</NameContainer>
                <ButtonGroup>
                    <Button
                        type='primary'
                        icon='play-circle'
                        onClick={this.joinRoom}
                        size='large'
                    >
                        Stwórz pokój
                    </Button>
                    <Popover
                        content={<span>Generuje nową nazwę pokoju</span>}
                        placement='bottom'
                    >
                        <Button
                            type='primary'
                            icon='reload'
                            size='large'
                            onClick={this.setNewRoomName}
                        />
                    </Popover>
                </ButtonGroup>
            </StyledContainer>
        );
    }
}

export { Home };